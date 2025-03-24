const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
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
    console.error("JWT error:", error);

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
