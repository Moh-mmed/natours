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
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//? Calculating the ratingsAverage
reviewSchema.statics.calcAverageRatings = async function (tourId) {
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
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne().clone();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
