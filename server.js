// Built-in modules
import path from "path";
import { fileURLToPath } from "url";

// External packages
import "dotenv/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import ExpressRateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import mongoose from "mongoose";
import morgan from "morgan";
import xss from "xss-clean";

// Internal imports
import passport from "./config/passport.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import authRoutes from "./routes/auth.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import timeTrackingRoutes from "./routes/timeTrackingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import logger from "./utils/logger.js";

// Get current file directory (replacement for __dirname in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust the proxy so that req.ip returns the correct client IP
app.set("trust proxy", true);

// Session middleware for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict", // Added for security
    },
  })
);

// Initialize Passport
app.use(passport.initialize());

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Specifically allow the frontend domain
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security middleware
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(cookieParser());

// Performance Middleware
app.use(compression()); // Compress responses
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // Logs HTTP requests

// Rate Limiting
const limiter = ExpressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Different limits for prod/dev
  message: {
    message: "Too many requests from this IP, please try again later.",
    error: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = ExpressRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    message: "Too many login attempts, please try again later.",
    error: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Add requestId to all requests for tracking
app.use(requestIdMiddleware);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: "majority",
      ssl: true, // Enable SSL for Atlas
      tlsAllowInvalidCertificates: false, // Ensure valid SSL certificates
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/user", userRoutes);
app.use("/api/time-tracking", timeTrackingRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/permissions", permissionRoutes);

// Health Check and Ping Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// Lightweight ping endpoint for waking up the server
app.get("/ping", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "pong",
    timestamp: new Date().toISOString(),
  });
});

// Base URL welcome message
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Nexell API",
    documentation: "https://github.com/your-repo/nexell",
    endpoints: {
      api: "/api",
      health: "/health",
      ping: "/ping",
    },
  });
});

// CORS preflight for all routes
app.options("*", cors());

// Serve static files only in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "public");
  app.use(express.static(publicPath));

  // Handle 404 for static files
  app.use((req, res, next) => {
    if (req.path.startsWith("/public/")) {
      res.status(404).json({
        status: "error",
        message: "Static file not found",
      });
    } else {
      next();
    }
  });
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    error: "NOT_FOUND",
  });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  logger.error("Error:", err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(
    `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Connect to database
connectDB();

export default app;
