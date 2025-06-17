const TimeLog = require("../models/TimeLog");
const Task = require("../models/Task");
const logger = require("../utils/logger");

class TimeTrackingService {
  /**
   * Start a timer for a task
   * Optionally stop any running timers for the user
   */
  async startTimer(userId, taskId, description = "", stopRunningTimers = true) {
    try {
      // Validate task exists and belongs to user
      const task = await Task.findOne({
        _id: taskId,
        $or: [{ owner: userId }, { assignedTo: userId }],
      });

      if (!task) {
        throw new Error(
          "Task not found or you don't have permission to access it"
        );
      }

      if (!task.isTimeTrackingEnabled) {
        throw new Error("Time tracking is disabled for this task");
      }

      // Stop any running timers for this user if required
      if (stopRunningTimers) {
        await this.stopAllRunningTimers(userId);
      }

      // Create new time log entry
      const timeLog = new TimeLog({
        task: taskId,
        user: userId,
        startTime: new Date(),
        description,
        isRunning: true,
      });

      await timeLog.save();

      // Update the task
      task.hasActiveTimer = true;
      task.lastActiveTimerId = timeLog._id;
      task.timeEntries.push(timeLog._id);

      await task.save();

      logger.info(`Timer started for task ${taskId} by user ${userId}`);
      return timeLog;
    } catch (error) {
      logger.error(`Error starting timer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop a specific timer
   */
  async stopTimer(userId, timeLogId) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        isRunning: true,
      });

      if (!timeLog) {
        throw new Error("Timer not found or already stopped");
      }

      timeLog.endTime = new Date();
      timeLog.isRunning = false;
      timeLog.duration = Math.round(
        (timeLog.endTime - timeLog.startTime) / 1000
      );

      await timeLog.save();

      // Update the task's totalTimeSpent
      const task = await Task.findById(timeLog.task);
      if (task) {
        task.totalTimeSpent = (task.totalTimeSpent || 0) + timeLog.duration;
        task.hasActiveTimer = false;

        await task.save();
      }

      logger.info(`Timer stopped for timeLog ${timeLogId} by user ${userId}`);
      return timeLog;
    } catch (error) {
      logger.error(`Error stopping timer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop all running timers for a user
   */
  async stopAllRunningTimers(userId) {
    try {
      const runningTimers = await TimeLog.find({
        user: userId,
        isRunning: true,
      });

      for (const timer of runningTimers) {
        timer.endTime = new Date();
        timer.isRunning = false;
        timer.duration = Math.round((timer.endTime - timer.startTime) / 1000);
        await timer.save();

        // Update the task's totalTimeSpent
        const task = await Task.findById(timer.task);
        if (task) {
          task.totalTimeSpent = (task.totalTimeSpent || 0) + timer.duration;
          task.hasActiveTimer = false;
          await task.save();
        }
      }

      logger.info(`Stopped all running timers for user ${userId}`);
      return runningTimers;
    } catch (error) {
      logger.error(`Error stopping running timers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a manual time entry
   */
  async addManualTimeEntry(
    userId,
    taskId,
    startTime,
    endTime,
    description = ""
  ) {
    try {
      // Validate the task
      const task = await Task.findOne({
        _id: taskId,
        $or: [{ owner: userId }, { assignedTo: userId }],
      });

      if (!task) {
        throw new Error(
          "Task not found or you don't have permission to access it"
        );
      }

      if (!task.isTimeTrackingEnabled) {
        throw new Error("Time tracking is disabled for this task");
      }

      // Validate times
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid start or end time");
      }

      if (end <= start) {
        throw new Error("End time must be after start time");
      }

      // Create time log entry
      const duration = Math.round((end - start) / 1000);
      const timeLog = new TimeLog({
        task: taskId,
        user: userId,
        startTime: start,
        endTime: end,
        duration,
        description,
        createdManually: true,
        isRunning: false,
      });

      await timeLog.save();

      // Update the task
      task.timeEntries.push(timeLog._id);
      task.totalTimeSpent = (task.totalTimeSpent || 0) + duration;
      await task.save();

      logger.info(
        `Manual time entry added for task ${taskId} by user ${userId}`
      );
      return timeLog;
    } catch (error) {
      logger.error(`Error adding manual time entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all time logs for a task
   */
  async getTimeLogsByTask(userId, taskId, query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "startTime",
        sortOrder = "desc",
      } = query;

      // Validate user has access to the task
      const task = await Task.findOne({
        _id: taskId,
        $or: [{ owner: userId }, { assignedTo: userId }],
      });

      if (!task) {
        throw new Error(
          "Task not found or you don't have permission to access it"
        );
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query with pagination
      const timeLogs = await TimeLog.find({ task: taskId })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("user", "username firstName lastName");

      // Get total count for pagination
      const total = await TimeLog.countDocuments({ task: taskId });

      return {
        timeLogs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching time logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the running timer for a user if any
   */
  async getRunningTimer(userId) {
    try {
      const runningTimer = await TimeLog.findOne({
        user: userId,
        isRunning: true,
      }).populate("task", "title");

      return runningTimer;
    } catch (error) {
      logger.error(`Error fetching running timer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get report of time spent by a user across all tasks
   */
  async getUserTimeReport(userId, query = {}) {
    try {
      const {
        startDate,
        endDate,
        taskId,
        groupBy = "day", // day, week, month, task
      } = query;

      const matchQuery = { user: userId };

      if (startDate || endDate) {
        matchQuery.startTime = {};
        if (startDate) matchQuery.startTime.$gte = new Date(startDate);
        if (endDate) matchQuery.startTime.$lte = new Date(endDate);
      }

      if (taskId) {
        matchQuery.task = taskId;
      }

      let groupByField = {};
      if (groupBy === "day") {
        groupByField = {
          $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
        };
      } else if (groupBy === "week") {
        groupByField = {
          $week: "$startTime",
        };
      } else if (groupBy === "month") {
        groupByField = {
          $dateToString: { format: "%Y-%m", date: "$startTime" },
        };
      } else if (groupBy === "task") {
        groupByField = "$task";
      }

      const results = await TimeLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupByField,
            totalDuration: { $sum: "$duration" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // If grouping by task, populate task details
      if (groupBy === "task") {
        // Get all task IDs from the results
        const taskIds = results.map((r) => r._id);

        // Fetch task details in a single query
        const tasks = await Task.find({ _id: { $in: taskIds } }, "title");

        // Create a map for quick lookups
        const taskMap = {};
        tasks.forEach((task) => {
          taskMap[task._id] = task.title;
        });

        // Enhance results with task details
        results.forEach((r) => {
          r.taskTitle = taskMap[r._id] || "Unknown Task";
        });
      }

      return results;
    } catch (error) {
      logger.error(`Error generating time report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a time log entry
   */
  async deleteTimeLog(userId, timeLogId) {
    try {
      // Find the time log and check permissions
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
      });

      if (!timeLog) {
        throw new Error(
          "Time log not found or you don't have permission to delete it"
        );
      }

      // Get the task to update its total time
      const task = await Task.findById(timeLog.task);

      if (task) {
        // Remove the time entry from the task's timeEntries array
        task.timeEntries = task.timeEntries.filter(
          (entry) => entry.toString() !== timeLogId.toString()
        );

        // Update the total time spent
        if (timeLog.duration && task.totalTimeSpent) {
          task.totalTimeSpent = Math.max(
            0,
            task.totalTimeSpent - timeLog.duration
          );
        }

        // Clear active timer reference if this was the active one
        if (
          task.lastActiveTimerId &&
          task.lastActiveTimerId.toString() === timeLogId.toString()
        ) {
          task.hasActiveTimer = false;
          task.lastActiveTimerId = null;
        }

        await task.save();
      }

      // Delete the time log
      await timeLog.deleteOne();

      logger.info(`Time log ${timeLogId} deleted by user ${userId}`);
      return timeLog;
    } catch (error) {
      logger.error(`Error deleting time log: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TimeTrackingService();
