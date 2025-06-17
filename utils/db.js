import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
const connectDB = async () => {
  try {
    // Connection options
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: "majority",
      // Remove deprecated options
      // useNewUrlParser and useUnifiedTopology are no longer needed in mongoose 6+
      autoIndex: process.env.NODE_ENV !== "production", // Disable auto-indexing in production
    };

    // Add SSL options for production environments
    if (process.env.NODE_ENV === "production") {
      options.ssl = true;
      options.tlsAllowInvalidCertificates = false;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection errors after initial connection
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    // Handle disconnection
    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
      setTimeout(connectDB, 5000); // Attempt to reconnect after 5 seconds
    });

    // Handle successful reconnection
    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        logger.error("Error during MongoDB connection closure:", err);
        process.exit(1);
      }
    });

    return conn.connection;
  } catch (error) {
    logger.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

export default connectDB;
