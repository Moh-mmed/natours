const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  //? jwt.sign(payload, secret, token expires token-header will be created automatically)
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN + 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  //? Send the JWT via COOKIES, (expose it to the client-side)
  res.cookie('jwt', token, cookieOptions);

  //? Remove the password from the output
  user.password = undefined;

  //* Send also the token to the client
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //? 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide valid email and password!', 400));
  }

  //? 2) Check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password');

  //? Compare the entered password with the one got from DB using bcrypt, BUT we create the correctPassword() in userModel
  const correct = user && (await user.correctPassword(password, user.password));

  //! We didn't separate email and password checking to not give a hint to the hacker
  if (!user || !correct) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //? 3) If everything is okay, send the token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

//* Protection Middleware

exports.protect = catchAsync(async (req, res, next) => {
  //? 1) Getting token and check if it's there, (best practice is to send the token along the http headers with the request )
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in, please log in'));
  }

  //? 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //? 3) Check if user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser)
    return next(
      new AppError('The user belonging to this token is no longer exist.', 401)
    );

  //? 4) Check if the user has changed password after the JWT was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Your password has been changed, please login again. ', 401)
    );
  }

  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

//! This Middleware is only for rendering Pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //? 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //? 2) Check if user still exists
      const freshUser = await User.findById(decoded.id);

      if (!freshUser) return next();

      //? 3) Check if the user has changed password after the JWT was issued

      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      //* Each template in the FrontEnd has access to res.locals, so the user will be accessible
      res.locals.user = freshUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//* Authorization Middleware

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };


//* Reset Password
exports.forgetPassword = catchAsync(async (req, res, next) => {
  //? 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  //? 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  //? 3) Send it to the user email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email, Try again later'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //? 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //? 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired'), 400);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //? 3) Update changedPasswordAt property for the user
  //! We did so in the userModel using pre middleware on 'save' hook.
  //? 4) log the user in, send JWT
  createSendToken(user, 200, res);
});

//* Update Password
exports.updatePassword = catchAsync(async (req, res, next) => {
  //? 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //? 2) Check if posted current password is correct
  const { passwordCurrent, password, passwordConfirm } = req.body;
  const correct = await user.correctPassword(passwordCurrent, user.password);

  if (!correct) {
    return next(
      new AppError('The old password is not correct, please try again', 401)
    );
  }

  //? 3) If so, update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;

  await user.save();
  //! User.findByIdAndUpdate() will NOT work as intended

  //? 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
