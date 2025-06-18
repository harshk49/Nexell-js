import express from "express";
import { query, param, body, validationResult } from "express-validator";
import integrationController from "../controllers/integrationController.js";
import { authenticateUser as authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/integrations/calendar
 * @desc    Get iCal calendar data for time entries, tasks, and projects
 * @access  Private
 */
router.get(
  "/calendar",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("includeTimeLogs").optional().isBoolean(),
    query("includeTaskDueDates").optional().isBoolean(),
    query("includeProjectDates").optional().isBoolean(),
    query("limitToProjects").optional().isString(), // Comma-separated project IDs
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process limitToProjects if it exists
    if (req.query.limitToProjects) {
      req.query.limitToProjects = req.query.limitToProjects.split(",");
    }

    // Convert string boolean params to actual booleans
    for (const key of [
      "includeTimeLogs",
      "includeTaskDueDates",
      "includeProjectDates",
    ]) {
      if (req.query[key] !== undefined) {
        req.query[key] = req.query[key] === "true";
      }
    }

    await integrationController.getCalendarData(req, res);
  }
);

/**
 * @route   GET /api/integrations/calendar/events
 * @desc    Get calendar events as JSON
 * @access  Private
 */
router.get(
  "/calendar/events",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("includeTimeLogs").optional().isBoolean(),
    query("includeTaskDueDates").optional().isBoolean(),
    query("includeProjectDates").optional().isBoolean(),
    query("limitToProjects").optional().isString(), // Comma-separated project IDs
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process limitToProjects if it exists
    if (req.query.limitToProjects) {
      req.query.limitToProjects = req.query.limitToProjects.split(",");
    }

    // Convert string boolean params to actual booleans
    for (const key of [
      "includeTimeLogs",
      "includeTaskDueDates",
      "includeProjectDates",
    ]) {
      if (req.query[key] !== undefined) {
        req.query[key] = req.query[key] === "true";
      }
    }

    await integrationController.getCalendarEvents(req, res);
  }
);

/**
 * @route   GET /api/integrations/invoice
 * @desc    Get invoice data for time entries
 * @access  Private
 */
router.get(
  "/invoice",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("projectId").optional().isMongoId(),
    query("billableOnly").optional().isBoolean(),
    query("groupBy").optional().isIn(["project", "task", "day"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Convert string boolean params to actual booleans
    if (req.query.billableOnly !== undefined) {
      req.query.billableOnly = req.query.billableOnly === "true";
    }

    await integrationController.getInvoiceData(req, res);
  }
);

/**
 * @route   POST /api/integrations/invoice/export
 * @desc    Export invoice data in various formats
 * @access  Private
 */
router.post(
  "/invoice/export",
  [query("format").optional().isIn(["csv", "excel", "pdf"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await integrationController.exportInvoice(req, res);
  }
);

/**
 * @route   GET /api/integrations/pomodoro/stats
 * @desc    Get Pomodoro timer statistics
 * @access  Private
 */
router.get(
  "/pomodoro/stats",
  [query("timeRange").optional().isIn(["day", "week", "month", "year"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await integrationController.getPomodoroStats(req, res);
  }
);

/**
 * @route   GET /api/integrations/pomodoro/settings
 * @desc    Get user's Pomodoro timer settings
 * @access  Private
 */
router.get("/pomodoro/settings", async (req, res) => {
  await integrationController.getPomodoroSettings(req, res);
});

/**
 * @route   PUT /api/integrations/pomodoro/settings
 * @desc    Update user's Pomodoro timer settings
 * @access  Private
 */
router.put(
  "/pomodoro/settings",
  [
    body("enabled").optional().isBoolean(),
    body("workDuration").optional().isInt({ min: 1, max: 120 }),
    body("shortBreakDuration").optional().isInt({ min: 1, max: 30 }),
    body("longBreakDuration").optional().isInt({ min: 1, max: 60 }),
    body("longBreakInterval").optional().isInt({ min: 1, max: 10 }),
    body("autoStartBreaks").optional().isBoolean(),
    body("autoStartPomodoros").optional().isBoolean(),
    body("soundEnabled").optional().isBoolean(),
    body("soundVolume").optional().isInt({ min: 0, max: 100 }),
    body("notification").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await integrationController.updatePomodoroSettings(req, res);
  }
);

export default router;
