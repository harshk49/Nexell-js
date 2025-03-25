const Task = require("../models/Task");
const logger = require("../utils/logger");

class TaskService {
  async createTask(taskData) {
    try {
      const task = new Task(taskData);
      await task.save();
      logger.info(`Task created with ID: ${task._id}`);
      return task;
    } catch (error) {
      logger.error(`Error creating task: ${error.message}`);
      throw error;
    }
  }

  async getTasks(userId, query) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        status,
        priority,
        category,
        project,
        isArchived,
        isPinned,
        search,
      } = query;

      const queryObj = { owner: userId };

      if (status) queryObj.status = status;
      if (priority) queryObj.priority = priority;
      if (category) queryObj.category = category;
      if (project) queryObj.project = project;
      if (isArchived !== undefined) queryObj.isArchived = isArchived === "true";
      if (isPinned !== undefined) queryObj.isPinned = isPinned === "true";

      if (search) {
        queryObj.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const tasks = await Task.find(queryObj)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("project", "name")
        .populate("parentTask", "title")
        .populate("assignedTo", "name email")
        .lean();

      const total = await Task.countDocuments(queryObj);

      return {
        tasks,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching tasks: ${error.message}`);
      throw error;
    }
  }

  async getTaskById(taskId, userId) {
    try {
      const task = await Task.findOne({
        _id: taskId,
        owner: userId,
      })
        .populate("project", "name")
        .populate("parentTask", "title")
        .populate("subtasks", "title status")
        .populate("dependencies", "title status")
        .populate("assignedTo", "name email")
        .populate("watchers", "name email")
        .populate("comments.user", "name email");

      if (!task) {
        throw new Error("Task not found");
      }

      return task;
    } catch (error) {
      logger.error(`Error fetching task: ${error.message}`);
      throw error;
    }
  }

  async updateTask(taskId, userId, updateData) {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, owner: userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!task) {
        throw new Error("Task not found");
      }

      logger.info(`Task updated with ID: ${taskId}`);
      return task;
    } catch (error) {
      logger.error(`Error updating task: ${error.message}`);
      throw error;
    }
  }

  async deleteTask(taskId, userId) {
    try {
      const task = await Task.findOne({
        _id: taskId,
        owner: userId,
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Delete subtasks if any
      if (task.subtasks && task.subtasks.length > 0) {
        await Task.deleteMany({ _id: { $in: task.subtasks } });
      }

      // Delete the task itself
      await task.deleteOne();

      logger.info(`Task and its subtasks deleted with ID: ${taskId}`);
      return task;
    } catch (error) {
      logger.error(`Error deleting task: ${error.message}`);
      throw error;
    }
  }

  async addComment(taskId, userId, commentData) {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, owner: userId },
        {
          $push: {
            comments: {
              user: userId,
              content: commentData.content,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      ).populate("comments.user", "name email");

      if (!task) {
        throw new Error("Task not found");
      }

      logger.info(`Comment added to task: ${taskId}`);
      return task;
    } catch (error) {
      logger.error(`Error adding comment: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TaskService();
