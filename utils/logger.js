import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get current file directory (replacement for __dirname in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  defaultMeta: { service: "nexell-api" },
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, metadata, stack }) => {
            // Extract request ID from metadata if available
            const requestId = metadata?.requestId
              ? ` [${metadata.requestId}]`
              : "";

            // Include stack trace for errors if available
            const errorStack = stack ? `\n${stack}` : "";

            return `${timestamp}${requestId} ${level}: ${message}${errorStack}`;
          }
        )
      ),
    }),
    // Write all error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write application-specific logs
    new winston.transports.File({
      filename: path.join(logsDir, "app.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Create a stream object for Morgan
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Add request ID tracking
const addRequestId = (req, res, next) => {
  const requestId =
    req.headers["x-request-id"] || Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
};

// Create a middleware for logging HTTP requests
const httpLogger = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs =
      elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;

    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedTimeInMs.toFixed(
        3
      )}ms`,
      {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: elapsedTimeInMs,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      }
    );
  });

  next();
};

export { logger as default, stream, addRequestId, httpLogger };
