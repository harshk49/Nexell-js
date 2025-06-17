import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

/**
 * Authentication middleware that verifies JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateUser = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided",
      error: "AUTH_NO_TOKEN",
    });
  }

  // Validate token format
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Invalid token format",
      error: "AUTH_INVALID_FORMAT",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        message: "Token has expired",
        error: "AUTH_TOKEN_EXPIRED",
      });
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error("JWT error:", error);

    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
        error: "AUTH_INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired",
        error: "AUTH_TOKEN_EXPIRED",
      });
    }

    res.status(500).json({
      message: "Internal server error during authentication",
      error: "AUTH_SERVER_ERROR",
    });
  }
};

// Legacy default export for backward compatibility
const auth = authenticateUser;
export default auth;

/**
 * Generate a JWT token for a user
 * @param {string} userId - The user's ID
 * @param {Object} additionalData - Additional data to include in the token
 * @returns {string} The generated JWT token
 */
export const generateAuthToken = (userId, additionalData = {}) => {
  return jwt.sign(
    {
      userId,
      ...additionalData,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};
