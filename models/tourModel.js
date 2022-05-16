const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

//! Creating Schemas
const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal to 40 characters'],
      minlength: [10, 'A tour must have greater or equal to 10 characters'],
    },
    duration: {
      type: Number,
      required: [true, ' A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, ' A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: {
        values: true,
        message: 'A tour must have a difficulty',
      },
      enum: {
        //! This validator only for strings
        values: ['easy', 'medium', 'difficult'], // must be of these only
        message: 'A tour must be either, easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [0, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val <= this.price;
        },
        message: 'Discount price {VALUE} should be lower or equal to the price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//* Add Index (Single Field Index)
//! 1: ASC,  -1 DEC
// tourSchema.index({ price: 1 });
//* Compound Index
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//* VIRTUAL property
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//* VIRTUAL populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// * Middlewares

//? 1. DOCUMENT MIDDLEWARE, the function will be called before the actual save to DB
// runs before .save()  .create() and NOT .insertMany()

tourSchema.pre('save', function (next) {
  // ? pre 'save' hook
  // ? so here you can add the logic that you want to perform before saving to the DB
  // * We will add a slug property to our document using name property
  // ! 'this' keyword points to currently processed document
  // !  next  should be called to invoke the next middleware
  this.slug = slugify(this.name, { lower: true });
  next();
});

//? Embed the users into tour document (NOT RECOMMENDED)

//  guides: Array
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//? Yu can call multiple pre or post middleware hooks
// tourSchema.pre('save', (next) => {
//   console.log('Will save the document');
//   next();
// });

//? Post middleware, runs after all pre middleware functions have completed

// tourSchema.post('save', (doc, next) => {
//   ! doc is the document after post middleware
//   next();
// });

//? 2. QUERY MIDDLEWARE, it allows us to run a function Before or After a certain query is executed

// tourSchema.pre('find', function (next) {
// ?/^find/ to match any query that have find word
tourSchema.pre(/^find/, function (next) {
  // ? pre 'find' hook
  // ? so here you can add the logic that you want to perform before querying from the DB
  // ! 'this' keyword points to currently processed query
  // * Let's assume we have secret tours on our DB, we want to filter out the tours which is secret
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  // ! Will not work with findOne() "we are using findByID()" in our example
  // * So you can add a middleware for each find 'findOne, findOneAndUpdate ...
  // * However, this is not practical. Instead, we can use reg exp
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//   // ! docs represents all documents we get after querying
//   next();
// });

//? 3. AGGREGATION MIDDLEWARE, it runs BEFORE or AFTER an Aggregation happened

// tourSchema.pre('aggregate', function (next) {
//   //* If we want to exclude the Secret tours before performing an aggregation, we can do so by excluding it in the Aggregation in tourController but then we need to add the same to any following aggregation which is not practical, instead we use Aggregation to do so before any aggregation.
//   // ! 'this' keyword points to currently Aggregation Object
//   // console.log(this.pipeline());

//   //? So our task is to filter out the secret tours before any aggregation. we do so by adding a match to the pipeline array using unshift
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });

//* DATA VALIDATION
//? Validation is to ensure that the data is entered in a right way
//! We add validation to our schema object

//* 1) There are many built in validators:
//*   - min/max
//*   - enum
//*   - minlength/maxlength

//* 2) Custom validators:
//*     - We add a validate: function(value){
//           *! NOTE: 'this' only points to the doc on NEW document creation, so it won't work with update
//*           which returns true if certain condition matches
//*           if false, then an error will be returned
//*           }

//! NOTES:
//*   - Add runValidators: true, as options to findByIdAndUpdate so the validation also runs on Update

//* DATA SANITIZATION
//? Sanitization is to clean the entered data so to ensure that there is no malicious code being injected to our DB or the application itself

//  Creating a model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
