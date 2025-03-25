const mongoose = require("mongoose");
const config = require("../config/config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri, config.db.options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Handle application termination
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error(`Error during MongoDB connection closure: ${err}`);
    process.exit(1);
  }
});

module.exports = connectDB;
