import { v4 as uuidv4 } from "uuid";

/**
 * Middleware that adds a unique request ID to each request
 * This allows for request tracing across logs and responses
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requestIdMiddleware = (req, res, next) => {
  // Generate a unique ID for this request
  const requestId = uuidv4();

  // Add it to the request object so other middleware/routes can access it
  req.requestId = requestId;

  // Also add it as a response header
  res.setHeader("X-Request-ID", requestId);

  next();
};
