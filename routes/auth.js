const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log(`[Auth Route Debug] ${req.method} ${req.path}`);
  console.log("Auth Route Headers:", req.headers);
  console.log("Auth Route Body:", req.body);
  next();
});

// Test route to verify router is working
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes are working" });
});

// Input validation middleware
const validateRegistration = (req, res, next) => {
  console.log("[Registration Validation] Starting validation");
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.log("[Registration Validation] Missing fields");
    return res.status(400).json({
      message: "All fields are required",
      error: "VALIDATION_MISSING_FIELDS",
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("[Registration Validation] Invalid email format");
    return res.status(400).json({
      message: "Invalid email format",
      error: "VALIDATION_INVALID_EMAIL",
    });
  }

  // Password strength validation
  if (password.length < 8) {
    console.log("[Registration Validation] Weak password");
    return res.status(400).json({
      message: "Password must be at least 8 characters long",
      error: "VALIDATION_WEAK_PASSWORD",
    });
  }

  console.log("[Registration Validation] Validation passed");
  next();
};

// POST /api/auth/register - Register a new user
router.post("/register", validateRegistration, async (req, res) => {
  console.log("[Registration] Processing request");
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    console.log("[Registration] Checking for existing user");
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      console.log("[Registration] User already exists:", existingUser.email);
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
        error: "REGISTRATION_DUPLICATE",
      });
    }

    // Create new user
    console.log("[Registration] Creating new user");
    const user = new User({
      username,
      email,
      password,
      isActive: true,
      lastLogin: new Date(),
    });

    await user.save();
    console.log("[Registration] User saved successfully");

    // Create JWT token for immediate login
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("[Registration] Registration successful");
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[Registration] Error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: "REGISTRATION_SERVER_ERROR",
    });
  }
});

// POST /api/auth/login - Authenticate user and return JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        error: "LOGIN_MISSING_FIELDS",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        error: "LOGIN_INVALID_CREDENTIALS",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated",
        error: "LOGIN_ACCOUNT_DEACTIVATED",
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        error: "LOGIN_INVALID_CREDENTIALS",
      });
    }

    // Update last login and login history
    user.lastLogin = new Date();
    user.loginHistory.push({
      date: new Date(),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    await user.save();

    // Create JWT payload and sign token
    const payload = {
      userId: user._id,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: "LOGIN_SERVER_ERROR",
    });
  }
});

module.exports = router;
