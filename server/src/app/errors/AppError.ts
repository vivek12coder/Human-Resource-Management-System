class AppError extends Error {
  public statusCode: number;
  public errorMessage: string;

  constructor(
    statusCode: number,
    message: string,
    errorMessage: string,
    stack = ''
  ) {
    super(message); // message property of Error
    this.statusCode = statusCode; // HTTP status code
    this.errorMessage = errorMessage; // Detailed error message

    // Set stack trace
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
