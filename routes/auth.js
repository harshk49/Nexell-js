const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
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
  const { username, email, password, firstName } = req.body;

  if (!username || !email || !password || !firstName) {
    console.log("[Registration Validation] Missing fields");
    return res.status(400).json({
      message: "All fields are required",
      error: "VALIDATION_MISSING_FIELDS",
    });
  }
  // Full name validation
  if (firstName.trim().length < 1) {
    console.log("[Registration Validation] Invalid first name");
    return res.status(400).json({
      message: "First name is required",
      error: "VALIDATION_INVALID_NAME",
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
    const { username, email, password, firstName } = req.body;

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
      firstName,
      lastName: req.body.lastName || "",
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
        firstName: user.firstName,
        lastName: user.lastName || "",
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
    const { emailOrUsername, password } = req.body;
    // Input validation
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: "Email/username and password are required",
        error: "LOGIN_MISSING_FIELDS",
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
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
        firstName: user.firstName,
        lastName: user.lastName || "",
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

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
// Google callback route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

// GitHub authentication route
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);
// GitHub callback route
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

module.exports = router;
