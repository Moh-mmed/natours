// Define and export Users route handlers
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

//? Test if the uploaded file is an Image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

//? Files uploader
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//? Create Photo uploader middleware
exports.uploadUserPhoto = upload.single('photo');

//? Resize User Photo
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

//? ADMINISTRATOR Control
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = (req, res, next) => {
  res.status(500).json({
    status: 'Error',
    message: 'This route is not defined, please use /signup instead',
  });
};

//! DO NOT Update Passwords With This
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
//
//
//
//
//
//
//
//? USER Control
//* Update User info
exports.updateMe = catchAsync(async (req, res, next) => {

  //? 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update, Please consider using /updatePassword.',
        400
      )
    );
  }

  //? 2) Filter out unwanted field's names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  //? 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

//* Delete Me
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

//* GET Me
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
