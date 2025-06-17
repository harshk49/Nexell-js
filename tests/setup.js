// Jest setup file for tests
import dotenv from "dotenv";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

// Setup environment variables for testing
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

// Silence console during tests (comment this out for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Clean up mongoose after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Global mock for winston logger
jest.mock("../utils/logger.js", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    stream: {
      write: jest.fn(),
    },
  },
  stream: { write: jest.fn() },
  addRequestId: jest.fn((req, res, next) => next()),
  httpLogger: jest.fn((req, res, next) => next()),
}));
