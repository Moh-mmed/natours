// This file is only for Express

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// How the app work flows:
// First: receive the requests into app.js
// Second: depending on the route we enter the router
// Depending on the http method, we execute a controller
// then send the response and finish the request/response cycle

// In order to access the request body, we use middleware
// We use Middleware to handle the data sent with Request or handling other things which happen while making a request

//? 1) Global MIDDLEWARES
// Middleware Stack (All routs will be exposed to these Middlewares)

//* Set security HTTP headers
// app.use(helmet());
//* Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//* Limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
// Apply the rate limiting middleware to API requests
app.use('/api', limiter);
// Apply the rate limiting middleware to all requests
// app.use(limiter);

//* Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // to add the body to the request
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//* COOKIE Parser,  For Authentication, we need to reed the JWT from the COOKIE using cookie-parser
app.use(cookieParser());

//* Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

//* Data Sanitization against XSS
app.use(xss());

//* Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//* Serving Static Files
// We can not easily access static files
// We use for that an express built in method express.static()
// we pass the directory from which our files will be accessed
// The request will look for predefined routes, if there isn't any. It will then go to the route we defined it in express.static and set it as a root, so any file inside will be access just by using /filename not public/filename

// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//* Compress all the texts that is sent to the client
app.use(compression());

//* Test middleware (we created it)
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3. ROUTES

// Mounting a new router on route, these counted as Middleware
// Here we specify specific routes to apply Middleware
// The Router is like a mini sub application

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// CATCH ALL ROUTES ERROR HANDLER
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `can't find ${req.originalUrl} on the server`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on the server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404)); // ! if anything is passed to next() in error handling middleware, Express will know that it's an error, which it will skip all other errors in the Middleware stack and execute the one we defined below
});

// ERROR HANDLER MIDDLEWARE
app.use(globalErrorHandler);
module.exports = app;
