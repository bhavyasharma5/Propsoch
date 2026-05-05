// Custom error classes so our error handler can differentiate between
// "something we expected might go wrong" vs "something actually blew up"
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

class ValidationError extends ApiError {
  constructor(message) {
    super(400, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = "You don't have permission to do this") {
    super(403, message);
  }
}

class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, message, false);
  }
}

const IsApiError = (err) => err instanceof ApiError;

module.exports = {
  ApiError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  IsApiError,
};
