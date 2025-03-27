const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");

// Validation middleware for updating preferences
const updatePreferencesValidation = [
  body("preferences.theme")
    .optional()
    .isIn(["light", "dark", "system"])
    .withMessage("Theme must be one of: light, dark, system"),
  body("preferences.notifications")
    .optional()
    .isBoolean()
    .withMessage("Notifications must be a boolean"),
  body("preferences.taskView")
    .optional()
    .isIn(["list", "board", "calendar"])
    .withMessage("Task view must be one of: list, board, calendar"),
  body("preferences.noteView")
    .optional()
    .isIn(["list", "grid"])
    .withMessage("Note view must be one of: list, grid"),
];

// GET /api/user/preferences - Get user preferences
router.get("/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("preferences");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "USER_NOT_FOUND",
      });
    }
    res.json({
      message: "User preferences retrieved successfully",
      preferences: user.preferences,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({
      message: "Error fetching user preferences",
      error: "PREFERENCES_FETCH_ERROR",
    });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put(
  "/preferences",
  authMiddleware,
  updatePreferencesValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND",
        });
      }

      // Update preferences
      if (req.body.preferences) {
        user.preferences = {
          ...user.preferences,
          ...req.body.preferences,
        };
      }

      await user.save();
      res.json({
        message: "User preferences updated successfully",
        preferences: user.preferences,
      });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({
        message: "Error updating user preferences",
        error: "PREFERENCES_UPDATE_ERROR",
      });
    }
  }
);

module.exports = router;
