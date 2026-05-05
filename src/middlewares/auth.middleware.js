const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../utils/ApiError");

// The assignment says we can assume userId is in the request.
// We support two ways to pass it:
//   1. X-User-Id header (easiest for Postman testing)
//   2. Bearer token in Authorization header (the "real" way)
function authMiddleware(req, res, next) {
  try {
    // Check for the simple header first (testing shortcut)
    const userIdHeader = req.headers["x-user-id"];
    if (userIdHeader) {
      req.userId = parseInt(userIdHeader);
      return next();
    }

    // Otherwise expect a JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No auth token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      next(new UnauthorizedError("Invalid or expired token"));
    } else {
      next(err);
    }
  }
}

module.exports = authMiddleware;
