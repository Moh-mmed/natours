class AppError extends Error {
  // ! This is an ERROR Class for Server Error
  constructor(message, statusCode) {
    super(message); // calling error passing message only, so we set the message to err.message property in the parent class (which is Error)

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'Fail' : 'Error';
    this.isOperational = true; // we will depend on this to know wether the error is operational or programming so that later on

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
