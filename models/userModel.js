const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    minlength: 8,
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//? PASSWORD ENCRYPTION

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

//? Set passwordChangedAt once we set new password or reset.
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

//? Checking password by instant method
//* instant methods is methods which are available for all documents

userSchema.methods.correctPassword = async (candidatePassword, userPassword) =>
  await bcrypt.compare(candidatePassword, userPassword);

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  //? the idea is to check if the passwordChangedAt exists first, then compare it with the JWTTimestamp (iat).
  //? return true if JWTTimestamp < passwordChangedAt which means the user logged in then he changed the password so we need to let him log again so it will be JWTTimestamp > passwordChangedAt which returns false.

  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return true && JWTTimestamp < changedAt;
  }

  return false;
};
//
//
//
//
//
//
//
//
userSchema.methods.createPasswordResetToken = function () {
  //! The password reset token should be a string but it doesn't need to be strong.
  //! This token is like a reset password allowing the user only to reset his password.
  //! And we should never store a plain reset token string to DB
  const resetToken = crypto.randomBytes(32).toString('hex');

  //? We need to encrypt the token and store it to DB temporary so we can compare to it later.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
//
//
//
//
//
//
//
//
const User = mongoose.model('User', userSchema);

module.exports = User;
