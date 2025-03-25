const taskService = require('../services/taskService');
const logger = require('../utils/logger');

class TaskController {
  async createTask(req, res) {
    try {
      const task = await taskService.createTask({
        ...req.body,
        owner: req.user.userId
      });
      res.status(201).json({
        message: 'Task created successfully',
        task
      });
    } catch (error) {
      logger.error(`Task creation error: ${error.message}`);
      res.status(500).json({
        message: 'Error creating task',
        error: 'TASK_CREATION_ERROR'
      });
    }
  }

  async getTasks(req, res) {
    try {
      const result = await taskService.getTasks(req.user.userId, req.query);
      res.json({
        message: 'Tasks retrieved successfully',
        ...result
      });
    } catch (error) {
      logger.error(`Task fetch error: ${error.message}`);
      res.status(500).json({
        message: 'Error fetching tasks',
        error: 'TASK_FETCH_ERROR'
      });
    }
  }

  async getTaskById(req, res) {
    try {
      const task = await taskService.getTaskById(req.params.id, req.user.userId);
      res.json({
        message: 'Task retrieved successfully',
        task
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          message: 'Task not found',
          error: 'TASK_NOT_FOUND'
        });
      }
      logger.error(`Task fetch error: ${error.message}`);
      res.status(500).json({
        message: 'Error fetching task',
        error: 'TASK_FETCH_ERROR'
      });
    }
  }

  async updateTask(req, res) {
    try {
      const task = await taskService.updateTask(
        req.params.id,
        req.user.userId,
        req.body
      );
      res.json({
        message: 'Task updated successfully',
        task
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          message: 'Task not found',
          error: 'TASK_NOT_FOUND'
        });
      }
      logger.error(`Task update error: ${error.message}`);
      res.status(500).json({
        message: 'Error updating task',
        error: 'TASK_UPDATE_ERROR'
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const task = await taskService.deleteTask(req.params.id, req.user.userId);
      res.json({
        message: 'Task deleted successfully',
        task
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          message: 'Task not found',
          error: 'TASK_NOT_FOUND'
        });
      }
      logger.error(`Task deletion error: ${error.message}`);
      res.status(500).json({
        message: 'Error deleting task',
        error: 'TASK_DELETION_ERROR'
      });
    }
  }

  async addComment(req, res) {
    try {
      const task = await taskService.addComment(
        req.params.id,
        req.user.userId,
        req.body
      );
      res.json({
        message: 'Comment added successfully',
        task
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          message: 'Task not found',
          error: 'TASK_NOT_FOUND'
        });
      }
      logger.error(`Comment addition error: ${error.message}`);
      res.status(500).json({
        message: 'Error adding comment',
        error: 'COMMENT_ADDITION_ERROR'
      });
    }
  }
}

module.exports = new TaskController(); 