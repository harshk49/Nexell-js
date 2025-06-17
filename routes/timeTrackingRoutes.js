const express = require("express");
const { body, param, validationResult } = require("express-validator");
const timeTrackingController = require("../controllers/timeTrackingController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/time-tracking/tasks/:taskId/start
 * @desc    Start a timer for a task
 * @access  Private
 */
router.post(
  "/tasks/:taskId/start",
  [
    param("taskId").isMongoId().withMessage("Invalid task ID"),
    body("description").optional().isString(),
    body("stopRunningTimers").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.startTimer(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/timers/:timeLogId/stop
 * @desc    Stop a specific timer
 * @access  Private
 */
router.post(
  "/timers/:timeLogId/stop",
  [param("timeLogId").isMongoId().withMessage("Invalid time log ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.stopTimer(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/timers/stop-all
 * @desc    Stop all running timers for the current user
 * @access  Private
 */
router.post("/timers/stop-all", async (req, res) => {
  await timeTrackingController.stopAllTimers(req, res);
});

/**
 * @route   POST /api/time-tracking/tasks/:taskId/manual-entry
 * @desc    Add a manual time entry for a task
 * @access  Private
 */
router.post(
  "/tasks/:taskId/manual-entry",
  [
    param("taskId").isMongoId().withMessage("Invalid task ID"),
    body("startTime").isISO8601().withMessage("Invalid start time"),
    body("endTime").isISO8601().withMessage("Invalid end time"),
    body("description").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.addManualTimeEntry(req, res);
  }
);

/**
 * @route   GET /api/time-tracking/tasks/:taskId/time-logs
 * @desc    Get all time logs for a task
 * @access  Private
 */
router.get(
  "/tasks/:taskId/time-logs",
  [param("taskId").isMongoId().withMessage("Invalid task ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.getTaskTimeLogs(req, res);
  }
);

/**
 * @route   GET /api/time-tracking/timers/running
 * @desc    Get the currently running timer for the user
 * @access  Private
 */
router.get("/timers/running", async (req, res) => {
  await timeTrackingController.getRunningTimer(req, res);
});

/**
 * @route   GET /api/time-tracking/reports/user
 * @desc    Get time tracking report for the user
 * @access  Private
 */
router.get("/reports/user", async (req, res) => {
  await timeTrackingController.getUserTimeReport(req, res);
});

/**
 * @route   DELETE /api/time-tracking/timers/:timeLogId
 * @desc    Delete a time log entry
 * @access  Private
 */
router.delete(
  "/timers/:timeLogId",
  [param("timeLogId").isMongoId().withMessage("Invalid time log ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.deleteTimeLog(req, res);
  }
);

module.exports = router;
