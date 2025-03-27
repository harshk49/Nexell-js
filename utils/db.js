const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: "majority",
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: process.env.NODE_ENV !== "production", // Disable auto-indexing in production
    });

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
  } catch (error) {
    logger.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
