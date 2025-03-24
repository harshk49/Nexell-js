const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const Task = require("../models/Task");

const router = express.Router();

/**
 * @route POST /api/tasks
 * @desc Create a new task
 * @access Private
 */
router.post(
  "/",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("dueDate").isISO8601().withMessage("Valid due date required"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { title, description, dueDate, priority } = req.body;
      const newTask = new Task({
        title,
        description,
        dueDate,
        priority,
        owner: req.user.userId,
      });
      await newTask.save();
      res
        .status(201)
        .json({ message: "Task created successfully", task: newTask });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @route GET /api/tasks
 * @desc Get all tasks of logged-in user
 * @access Private
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.user.userId });
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @route GET /api/tasks/:id
 * @desc Get a single task by ID
 * @access Private
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: "Unauthorized" });

    res.status(200).json({ task });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @route PUT /api/tasks/:id
 * @desc Update a task
 * @access Private
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, priority, isCompleted } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: "Unauthorized" });

    task.title = title || task.title;
    task.description = description || task.description;
    task.dueDate = dueDate || task.dueDate;
    task.priority = priority || task.priority;
    task.isCompleted =
      isCompleted !== undefined ? isCompleted : task.isCompleted;

    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @route DELETE /api/tasks/:id
 * @desc Delete a task
 * @access Private
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: "Unauthorized" });

    await task.remove();
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
