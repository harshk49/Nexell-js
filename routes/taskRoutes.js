const express = require("express");
const { body, validationResult } = require("express-validator");
const Task = require("../models/Task"); // Ensure this model exists
const authMiddleware = require("../middleware/auth"); // Auth middleware for protected routes

const router = express.Router();

// Middleware to normalize status field - convert hyphens to spaces
const normalizeStatusMiddleware = (req, res, next) => {
  if (req.body && req.body.status) {
    // Convert any status with hyphens (e.g., "in-progress") to spaces ("in progress")
    req.body.status = req.body.status.replace(/-/g, " ");
    console.log(
      `[Status Normalization] Normalized status to: ${req.body.status}`
    );
  }
  next();
};

// Validation middleware
const taskValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").optional().isString(),
  body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),
  body("status")
    .optional()
    .isIn(["pending", "in progress", "completed", "cancelled", "on hold"])
    .withMessage("Invalid status"),
  body("category").optional().isString(),
  body("tags").optional().isArray(),
  body("project").optional().isMongoId().withMessage("Invalid project ID"),
  body("parentTask")
    .optional()
    .isMongoId()
    .withMessage("Invalid parent task ID"),
  body("progress")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Progress must be between 0 and 100"),
  body("estimatedTime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Estimated time must be positive"),
  body("actualTime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Actual time must be positive"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date"),
  body("color").optional().isHexColor().withMessage("Invalid color format"),
  body("recurring.isRecurring").optional().isBoolean(),
  body("recurring.frequency")
    .optional()
    .isIn(["daily", "weekly", "monthly", "yearly"])
    .withMessage("Invalid frequency"),
  body("recurring.interval")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Interval must be positive"),
  body("recurring.endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date"),
  body("isArchived").optional().isBoolean(),
  body("isPinned").optional().isBoolean(),
  body("isPrivate").optional().isBoolean(),
  body("isTemplate").optional().isBoolean(),
];

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  "/",
  authMiddleware,
  normalizeStatusMiddleware,
  taskValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const task = new Task({
        ...req.body,
        owner: req.user.userId,
      });

      await task.save();
      res.status(201).json({ message: "Task created successfully", task });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for the authenticated user with filtering and pagination
 * @access  Private
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      project,
      isArchived,
      isPinned,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { owner: req.user.userId };

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (project) query.project = project;
    if (isArchived !== undefined) query.isArchived = isArchived === "true";
    if (isPinned !== undefined) query.isPinned = isPinned === "true";

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const tasks = await Task.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("project", "name")
      .populate("parentTask", "title")
      .populate("assignedTo", "name email");

    const total = await Task.countDocuments(query);

    res.status(200).json({
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID with populated references
 * @access  Private
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    })
      .populate("project", "name")
      .populate("parentTask", "title")
      .populate("subtasks", "title status")
      .populate("dependencies", "title status")
      .populate("assignedTo", "name email")
      .populate("watchers", "name email")
      .populate("comments.user", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ task });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put(
  "/:id",
  authMiddleware,
  normalizeStatusMiddleware,
  taskValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const task = await Task.findOne({
        _id: req.params.id,
        owner: req.user.userId,
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Update fields
      Object.keys(req.body).forEach((key) => {
        if (req.body[key] !== undefined) {
          task[key] = req.body[key];
        }
      });

      await task.save();
      res.status(200).json({ message: "Task updated successfully", task });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task and its subtasks
 * @access  Private
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Delete subtasks if any
    if (task.subtasks && task.subtasks.length > 0) {
      await Task.deleteMany({ _id: { $in: task.subtasks } });
    }

    // Delete the task itself
    await task.deleteOne();

    res
      .status(200)
      .json({ message: "Task and its subtasks deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    Add a comment to a task
 * @access  Private
 */
router.post(
  "/:id/comments",
  authMiddleware,
  [body("content").notEmpty().withMessage("Comment content is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const task = await Task.findOne({
        _id: req.params.id,
        owner: req.user.userId,
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      task.comments.push({
        user: req.user.userId,
        content: req.body.content,
      });

      await task.save();
      res.status(201).json({ message: "Comment added successfully", task });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

/**
 * @route   PUT /api/tasks/:id/progress
 * @desc    Update task progress
 * @access  Private
 */
router.put(
  "/:id/progress",
  authMiddleware,
  [
    body("progress")
      .isInt({ min: 0, max: 100 })
      .withMessage("Progress must be between 0 and 100"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const task = await Task.findOne({
        _id: req.params.id,
        owner: req.user.userId,
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      task.progress = req.body.progress;
      if (task.progress === 100) {
        task.status = "completed";
      }

      await task.save();
      res.status(200).json({ message: "Progress updated successfully", task });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

module.exports = router;
