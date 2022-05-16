const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

//! Open to public
// ? User signup
router.post('/signup', authController.signup);
// ? User login
router.post('/login', authController.login);
// ? User logout
router.get('/logout', authController.logout);
// ? Forget password
router.post('/forgetPassword', authController.forgetPassword);
// ? Reset password
router.patch('/resetPassword/:token', authController.resetPassword);

//! Needs Login
router.use(authController.protect);
router.patch('/updatePassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

//! Administrator Only
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
