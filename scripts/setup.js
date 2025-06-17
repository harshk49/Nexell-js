#!/usr/bin/env node

/**
 * Nexell Setup Script
 *
 * This script helps set up the Nexell application by:
 * - Creating necessary directories
 * - Creating default .env file if it doesn't exist
 * - Creating SSL certificates for development
 * - Setting up initial MongoDB indexes
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import readline from "readline";
import crypto from "crypto";
import chalk from "chalk";

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Ask a question and get user input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User response
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Generate a random secret
 * @param {number} length - Length of the secret
 * @returns {string} - Random secret
 */
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
function createDirIfNotExists(dirPath) {
  const fullPath = path.join(rootDir, dirPath);
  if (!fs.existsSync(fullPath)) {
    console.log(chalk.blue(`Creating directory: ${dirPath}`));
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(chalk.green(`✓ Directory created: ${dirPath}`));
  } else {
    console.log(chalk.yellow(`Directory already exists: ${dirPath}`));
  }
}

/**
 * Create .env file if it doesn't exist
 */
function createEnvFile() {
  const envPath = path.join(rootDir, ".env");
  const envExamplePath = path.join(rootDir, ".env.example");

  if (!fs.existsSync(envPath)) {
    console.log(chalk.blue("Creating .env file from .env.example"));

    // Read .env.example
    let envContent = fs.readFileSync(envExamplePath, "utf8");

    // Replace secrets with generated values
    envContent = envContent.replace(
      /your_jwt_secret_key_change_in_production/g,
      generateSecret()
    );
    envContent = envContent.replace(
      /your_session_secret_change_in_production/g,
      generateSecret()
    );
    envContent = envContent.replace(/dev_redis_password/g, generateSecret(16));

    // Write to .env file
    fs.writeFileSync(envPath, envContent);
    console.log(chalk.green("✓ .env file created with secure random secrets"));
  } else {
    console.log(chalk.yellow(".env file already exists, skipping"));
  }
}

/**
 * Create self-signed SSL certificates for development
 */
function createSslCertificates() {
  const sslDir = path.join(rootDir, "nginx", "ssl");

  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
  }

  const keyPath = path.join(sslDir, "server.key");
  const certPath = path.join(sslDir, "server.crt");

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log(
      chalk.blue("Creating self-signed SSL certificates for development")
    );

    try {
      // Generate self-signed certificate
      execSync(
        `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -subj "/CN=localhost"`,
        { stdio: "inherit" }
      );
      console.log(chalk.green("✓ SSL certificates created"));
    } catch (error) {
      console.error(
        chalk.red(
          "Failed to create SSL certificates. Make sure OpenSSL is installed."
        )
      );
      console.log(
        chalk.yellow(
          "You can manually create certificates or skip this step for development."
        )
      );
    }
  } else {
    console.log(chalk.yellow("SSL certificates already exist, skipping"));
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log(chalk.bold.blue("=== Nexell Application Setup ==="));

  // Create necessary directories
  createDirIfNotExists("logs");
  createDirIfNotExists("nginx/logs");
  createDirIfNotExists("nginx/ssl");
  createDirIfNotExists("mongo-init");

  // Create .env file
  createEnvFile();

  // Create SSL certificates
  createSslCertificates();

  // Ask user if they want to start the application
  const startApp = await askQuestion(
    chalk.blue(
      "Do you want to start the application in development mode? (y/n): "
    )
  );

  if (startApp.toLowerCase() === "y") {
    console.log(chalk.blue("Starting application in development mode..."));
    try {
      execSync("docker-compose -f docker-compose.dev.yml up -d", {
        stdio: "inherit",
      });
      console.log(
        chalk.green("✓ Application started successfully in development mode")
      );
      console.log(chalk.bold.green("You can access:"));
      console.log(chalk.green("- API: http://localhost:5000"));
      console.log(chalk.green("- MongoDB Admin: http://localhost:8081"));
      console.log(chalk.green("- Redis Commander: http://localhost:8082"));
    } catch (error) {
      console.error(chalk.red("Failed to start application. See error above."));
    }
  }

  console.log(chalk.bold.green("Setup completed! 🎉"));
  rl.close();
}

// Run setup
setup().catch((error) => {
  console.error(chalk.red("Setup failed:"), error);
  rl.close();
  process.exit(1);
});
