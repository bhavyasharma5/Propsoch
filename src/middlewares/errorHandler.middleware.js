const { IsApiError } = require("../utils/ApiError");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Headers already sent - Express will handle cleanup, nothing we can do
  if (res.headersSent) return next(err);

  if (IsApiError(err)) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Yup validation errors come through as ValidationError with .errors array
  if (err.name === "ValidationError" && err.errors) {
    return res.status(400).json({
      success: false,
      message: err.errors[0] || "Validation failed",
    });
  }

  // Log the unexpected ones
  console.error("[Unhandled Error]", err);

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
}

module.exports = errorHandler;
