import taskService from "../services/taskService.js";
import logger from "../utils/logger.js";

/**
 * Task Controller - Handles HTTP requests related to tasks
 */
class TaskController {
  /**
   * Create a new task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTask(req, res) {
    try {
      // Add user ID from authentication token
      const taskData = {
        ...req.body,
        owner: req.user.userId,
      };

      const task = await taskService.createTask(taskData);

      logger.info(`Task created: ${task._id} by user ${req.user.userId}`);

      res.status(201).json({
        success: true,
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      logger.error(`Task creation error: ${error.message}`, {
        requestId: req.requestId,
      });

      // Handle validation errors
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => err.message),
          error: "TASK_VALIDATION_ERROR",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating task",
        error: "TASK_CREATION_ERROR",
      });
    }
  }

  /**
   * Get tasks with pagination, filtering and sorting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTasks(req, res) {
    try {
      const result = await taskService.getTasks(req.user.userId, req.query);

      res.json({
        success: true,
        message: "Tasks retrieved successfully",
        ...result,
      });
    } catch (error) {
      logger.error(`Task fetch error: ${error.message}`, {
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        message: "Error fetching tasks",
        error: "TASK_FETCH_ERROR",
      });
    }
  }

  /**
   * Get a single task by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTaskById(req, res) {
    try {
      const task = await taskService.getTaskById(
        req.params.id,
        req.user.userId
      );

      res.json({
        success: true,
        message: "Task retrieved successfully",
        task,
      });
    } catch (error) {
      logger.error(`Task fetch error: ${error.message}`, {
        requestId: req.requestId,
      });

      if (error.message === "Task not found" || error.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Task not found",
          error: "TASK_NOT_FOUND",
        });
      }

      if (error.message === "Unauthorized access") {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this task",
          error: "TASK_ACCESS_DENIED",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error fetching task",
        error: "TASK_FETCH_ERROR",
      });
    }
  }

  /**
   * Update a task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTask(req, res) {
    try {
      const task = await taskService.updateTask(
        req.params.id,
        req.user.userId,
        req.body
      );

      logger.info(`Task updated: ${req.params.id} by user ${req.user.userId}`);

      res.json({
        success: true,
        message: "Task updated successfully",
        task,
      });
    } catch (error) {
      logger.error(`Task update error: ${error.message}`, {
        requestId: req.requestId,
      });

      if (error.message === "Task not found" || error.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Task not found",
          error: "TASK_NOT_FOUND",
        });
      }

      if (error.message === "Unauthorized access") {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update this task",
          error: "TASK_ACCESS_DENIED",
        });
      }

      // Handle validation errors
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => err.message),
          error: "TASK_VALIDATION_ERROR",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating task",
        error: "TASK_UPDATE_ERROR",
      });
    }
  }

  /**
   * Delete a task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteTask(req, res) {
    try {
      const task = await taskService.deleteTask(req.params.id, req.user.userId);

      logger.info(`Task deleted: ${req.params.id} by user ${req.user.userId}`);

      res.json({
        success: true,
        message: "Task deleted successfully",
        task,
      });
    } catch (error) {
      logger.error(`Task deletion error: ${error.message}`, {
        requestId: req.requestId,
      });

      if (error.message === "Task not found" || error.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Task not found",
          error: "TASK_NOT_FOUND",
        });
      }

      if (error.message === "Unauthorized access") {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to delete this task",
          error: "TASK_ACCESS_DENIED",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error deleting task",
        error: "TASK_DELETION_ERROR",
      });
    }
  }
}

export default new TaskController();
