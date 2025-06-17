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

/**
 * @route   GET /api/time-tracking/preferences
 * @desc    Get user's time tracking preferences
 * @access  Private
 */
router.get("/preferences", async (req, res) => {
  await timeTrackingController.getUserTimeTrackingPreferences(req, res);
});

/**
 * @route   PUT /api/time-tracking/preferences
 * @desc    Update user's time tracking preferences
 * @access  Private
 */
router.put(
  "/preferences",
  [
    body("preferences").isObject().withMessage("Preferences must be an object"),
    body("preferences.timeTracking").optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.updateTimeTrackingPreferences(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/idle
 * @desc    Handle idle time detection
 * @access  Private
 */
router.post(
  "/idle",
  [
    body("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("idleTimeMinutes")
      .isNumeric()
      .withMessage("Idle time must be a number"),
    body("action")
      .isIn(["keep", "discard", "stop"])
      .withMessage("Invalid idle time action"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.handleIdleTime(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/pomodoro/start
 * @desc    Start a Pomodoro session
 * @access  Private
 */
router.post(
  "/pomodoro/start",
  [
    body("taskId").isMongoId().withMessage("Invalid task ID"),
    body("pomodoroSettings").optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.startPomodoroSession(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/pomodoro/complete
 * @desc    Complete a Pomodoro session
 * @access  Private
 */
router.post(
  "/pomodoro/complete",
  [
    body("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("completed")
      .isBoolean()
      .withMessage("Completed status must be a boolean"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.completePomodoroSession(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/break/start
 * @desc    Start a break
 * @access  Private
 */
router.post(
  "/break/start",
  [
    body("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("breakType")
      .isIn(["short", "long"])
      .withMessage("Break type must be 'short' or 'long'"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.startBreak(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/break/end
 * @desc    End a break
 * @access  Private
 */
router.post(
  "/break/end",
  [
    body("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("breakId").isMongoId().withMessage("Invalid break ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.endBreak(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/time-entries/:timeLogId/split
 * @desc    Split a time entry
 * @access  Private
 */
router.post(
  "/time-entries/:timeLogId/split",
  [
    param("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("splitTime")
      .isISO8601()
      .withMessage("Split time must be a valid ISO 8601 date"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    req.body.timeLogId = req.params.timeLogId;
    await timeTrackingController.splitTimeEntry(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/time-entries/merge
 * @desc    Merge multiple time entries
 * @access  Private
 */
router.post(
  "/time-entries/merge",
  [
    body("timeLogIds").isArray().withMessage("Time log IDs must be an array"),
    body("timeLogIds.*").isMongoId().withMessage("Invalid time log ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.mergeTimeEntries(req, res);
  }
);

/**
 * @route   POST /api/time-tracking/time-entries/:timeLogId/duplicate
 * @desc    Duplicate a time entry
 * @access  Private
 */
router.post(
  "/time-entries/:timeLogId/duplicate",
  [
    param("timeLogId").isMongoId().withMessage("Invalid time log ID"),
    body("adjustments").optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    req.body.timeLogId = req.params.timeLogId;
    await timeTrackingController.duplicateTimeEntry(req, res);
  }
);

/**
 * @route   PUT /api/time-tracking/time-entries/bulk
 * @desc    Bulk update time entries
 * @access  Private
 */
router.put(
  "/time-entries/bulk",
  [
    body("timeLogIds").isArray().withMessage("Time log IDs must be an array"),
    body("timeLogIds.*").isMongoId().withMessage("Invalid time log ID"),
    body("updates").isObject().withMessage("Updates must be an object"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await timeTrackingController.bulkUpdateTimeEntries(req, res);
  }
);

module.exports = router;
