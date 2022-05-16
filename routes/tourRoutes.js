const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

// 1. initialize Router
const router = express.Router();

// router
//   .route('/:tourId/reviews')
//   .get(reviewController.getAllReviews)
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

//? Merge the reviewRouter to tourRouter
//! This will allow using http methods of reviewRouter on tourRouter Once hitting '/:tourId/reviews' route
router.use('/:tourId/reviews', reviewRouter);

// Param Middleware it runs only for certain params, here we use it to check if the ID is valid or not
// router.param('id', tourController.checkID);

// A route for best five and cheapest tours
// So we gonna use same route method to getAllRoutes BUT first we add a middleware which pre fills the search query
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

//? Stats Route
router.route('/tour-stats').get(tourController.getTourStats);

//? Monthly Plan Route
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

//? tours within
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

//? Calculate distance from one point to all tours
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// 3. export Router to consume it in the App as Middleware
module.exports = router;
