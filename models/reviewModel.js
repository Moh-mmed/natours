const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review can not be empty!'],
    },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//? Calculating the ratingsAverage
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //! statics works with Model only
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  //? Update the tour
  await Tour.findByIdAndUpdate(tourId, {
    ratingsAverage: stats.length > 0 ? stats[0].nRating : 0,
    ratingsQuantity: stats.length > 0 ? stats[0].avgRating : 0,
  });
};

//? We want the User gives only one review to tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//? Calculate ratingsAverage
reviewSchema.post('save', function () {
  //! 'this' here points to DOCUMENT
  // this.constructor points to the constructor of reviewSchema which is Review
  this.constructor.calcAverageRatings(this.tour);
});

//? findByIdAndUpdate
//? findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //! 'this' here points to query and not DOCUMENT, So we have no access to review document
  //? We need to save the returned doc to "this" in order to get tourId later
  //! MongoDB does not allow Twice query, we need to use clone
  this.r = await this.findOne().clone();
  next();
});

//! REMEMBER: You can not calculate the ratingsAvg since the document is not yet Updated in the DB till now. So we need to use post middleware.

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
