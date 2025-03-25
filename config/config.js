require("dotenv").config();

module.exports = {
  // Database Configuration
  db: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/tasks-notes-app",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Application Configuration
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Pagination Defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "combined",
    filename: "logs/app.log",
  },
};
