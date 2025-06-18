import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import User from "../models/User.js";

import logger from "../utils/logger.js";
import {
  roundTimeToInterval,
  isWithinWorkingHours,
  calculateBillableAmount,
  formatDuration,
  isLongRunningTimer,
  getPomodoroSessionInfo,
} from "../utils/timeUtils.js";

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

  /**
   * Get user's time tracking preferences
   */
  async getUserTimeTrackingPreferences(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Default preferences if not set
      if (!user.preferences.timeTracking) {
        return {
          roundingInterval: 1,
          idleDetection: {
            enabled: true,
            threshold: 10,
            action: "prompt",
          },
          alertsEnabled: true,
          longRunningThreshold: 8,
          workingHours: {
            enabled: false,
            start: "09:00",
            end: "17:00",
            workDays: [1, 2, 3, 4, 5],
          },
          pomodoroSettings: {
            enabled: false,
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            sessionsBeforeLongBreak: 4,
          },
        };
      }

      return user.preferences.timeTracking;
    } catch (error) {
      logger.error(
        `Error fetching user time tracking preferences: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Update user's time tracking preferences
   */
  async updateTimeTrackingPreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Update preferences
      user.preferences.timeTracking = {
        ...user.preferences.timeTracking,
        ...preferences,
      };

      await user.save();

      return user.preferences.timeTracking;
    } catch (error) {
      logger.error(
        `Error updating user time tracking preferences: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle idle time detection
   */
  async handleIdleTime(userId, timeLogId, idleMinutes, action) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        isRunning: true,
      });

      if (!timeLog) {
        throw new Error("Running timer not found");
      }

      // Handle action based on user's choice
      switch (action) {
        case "keep":
          // Do nothing, keep timer running
          return timeLog;

        case "discard":
          // Adjust the start time to exclude idle time
          const adjustedStartTime = new Date(
            new Date().getTime() - idleMinutes * 60 * 1000
          );
          timeLog.adjustments.push({
            type: "idle",
            amount: idleMinutes,
            reason: `Discarded ${idleMinutes} minutes of idle time`,
            timestamp: new Date(),
          });
          timeLog.idleTime += idleMinutes;
          timeLog.startTime = adjustedStartTime;
          await timeLog.save();
          return timeLog;

        case "stop":
          // Stop the timer and adjust the end time
          const endTime = new Date(
            new Date().getTime() - idleMinutes * 60 * 1000
          );
          timeLog.isRunning = false;
          timeLog.endTime = endTime;

          // Calculate duration excluding idle time
          const durationMinutes = Math.round(
            (endTime - timeLog.startTime) / 1000 / 60
          );
          timeLog.duration = durationMinutes;

          // Record the idle time adjustment
          timeLog.adjustments.push({
            type: "idle",
            amount: idleMinutes,
            reason: `Timer stopped with ${idleMinutes} minutes of idle time excluded`,
            timestamp: new Date(),
          });

          timeLog.idleTime += idleMinutes;

          await timeLog.save();

          // Update task's total time
          await this.updateTaskTotalTime(timeLog.task);

          return timeLog;

        default:
          throw new Error("Invalid idle time action");
      }
    } catch (error) {
      logger.error(`Error handling idle time: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start a Pomodoro timer session
   */
  async startPomodoroSession(userId, taskId, description = "") {
    try {
      const user = await User.findById(userId);
      if (!user || !user.preferences.timeTracking?.pomodoroSettings?.enabled) {
        throw new Error("Pomodoro settings not enabled");
      }

      const pomodoroSettings = user.preferences.timeTracking.pomodoroSettings;

      // Get the most recent pomodoro timer (if any)
      const lastPomodoro = await TimeLog.findOne({
        user: userId,
        "pomodoro.isPomodoro": true,
      }).sort({ createdAt: -1 });

      let completedSessions = 0;
      if (lastPomodoro) {
        completedSessions = lastPomodoro.pomodoro.completedSessions;
      }

      // Get session info - what type of session should we start
      const sessionInfo = getPomodoroSessionInfo(
        pomodoroSettings,
        completedSessions
      );

      // Stop any running timers
      await this.stopAllRunningTimers(userId);

      // Create the new pomodoro session timer
      const timer = new TimeLog({
        task: taskId,
        user: userId,
        startTime: new Date(),
        isRunning: true,
        description:
          description ||
          (sessionInfo.isBreak ? "Pomodoro Break" : "Pomodoro Work Session"),
        pomodoro: {
          isPomodoro: true,
          sessionNumber: completedSessions + 1,
          completedSessions: completedSessions,
        },
      });

      await timer.save();

      return {
        timer,
        sessionInfo,
        endTime: new Date(
          new Date().getTime() + sessionInfo.duration * 60 * 1000
        ),
      };
    } catch (error) {
      logger.error(`Error starting pomodoro session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete a Pomodoro session
   */
  async completePomodoroSession(userId, timeLogId) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        "pomodoro.isPomodoro": true,
        isRunning: true,
      });

      if (!timeLog) {
        throw new Error("Running Pomodoro session not found");
      }

      // Stop the timer
      timeLog.isRunning = false;
      timeLog.endTime = new Date();

      // Calculate duration
      const durationMinutes = Math.round(
        (timeLog.endTime - timeLog.startTime) / 1000 / 60
      );
      timeLog.duration = durationMinutes;

      // Increment completed sessions if this was a work session
      const user = await User.findById(userId);
      const pomodoroSettings = user.preferences.timeTracking.pomodoroSettings;
      const sessionInfo = getPomodoroSessionInfo(
        pomodoroSettings,
        timeLog.pomodoro.completedSessions
      );

      if (sessionInfo.sessionType === "work") {
        timeLog.pomodoro.completedSessions += 1;
      }

      await timeLog.save();

      // If this was a work session, update task's total time
      if (sessionInfo.sessionType === "work") {
        await this.updateTaskTotalTime(timeLog.task);
      }

      return {
        timeLog,
        nextSession: getPomodoroSessionInfo(
          pomodoroSettings,
          timeLog.pomodoro.completedSessions
        ),
      };
    } catch (error) {
      logger.error(`Error completing pomodoro session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add break to running timer
   */
  async startBreak(userId, timeLogId, reason = "") {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        isRunning: true,
      });

      if (!timeLog) {
        throw new Error("Running timer not found");
      }

      // Add break to the time log
      timeLog.breaks.push({
        startTime: new Date(),
        endTime: null,
        duration: 0,
        reason,
      });

      await timeLog.save();

      return {
        timeLog,
        breakId: timeLog.breaks[timeLog.breaks.length - 1]._id,
      };
    } catch (error) {
      logger.error(`Error starting break: ${error.message}`);
      throw error;
    }
  }

  /**
   * End break in running timer
   */
  async endBreak(userId, timeLogId, breakId) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        isRunning: true,
      });

      if (!timeLog) {
        throw new Error("Running timer not found");
      }

      // Find the break
      const breakIndex = timeLog.breaks.findIndex(
        (b) => b._id.toString() === breakId
      );

      if (breakIndex === -1 || timeLog.breaks[breakIndex].endTime) {
        throw new Error("Break not found or already ended");
      }

      // Update the break
      timeLog.breaks[breakIndex].endTime = new Date();
      const breakDuration = Math.round(
        (timeLog.breaks[breakIndex].endTime -
          timeLog.breaks[breakIndex].startTime) /
          1000 /
          60
      );
      timeLog.breaks[breakIndex].duration = breakDuration;

      await timeLog.save();

      return timeLog;
    } catch (error) {
      logger.error(`Error ending break: ${error.message}`);
      throw error;
    }
  }

  /**
   * Split a time entry
   */
  async splitTimeEntry(userId, timeLogId, splitPoint) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
        isRunning: false, // Can only split completed entries
      });

      if (!timeLog) {
        throw new Error("Time entry not found or is still running");
      }

      if (!timeLog.endTime) {
        throw new Error("Cannot split an entry without an end time");
      }

      // Convert splitPoint to minutes if it's a percentage
      let splitMinutes;
      if (splitPoint < 1) {
        splitMinutes = Math.round(timeLog.duration * splitPoint);
      } else {
        splitMinutes = splitPoint;
      }

      if (splitMinutes <= 0 || splitMinutes >= timeLog.duration) {
        throw new Error("Invalid split point");
      }

      // Calculate the split time
      const splitTime = new Date(
        timeLog.startTime.getTime() + splitMinutes * 60 * 1000
      );

      // Create the second part of the split
      const secondPart = new TimeLog({
        task: timeLog.task,
        user: timeLog.user,
        startTime: splitTime,
        endTime: timeLog.endTime,
        duration: timeLog.duration - splitMinutes,
        isRunning: false,
        description: timeLog.description,
        createdManually: false,
        tags: timeLog.tags,
        billable: timeLog.billable,
        hourlyRate: timeLog.hourlyRate,
        adjustments: [
          {
            type: "split",
            amount: timeLog.duration - splitMinutes,
            reason: `Split from time entry ${timeLog._id}`,
            timestamp: new Date(),
          },
        ],
      });

      await secondPart.save();

      // Update the first part
      timeLog.endTime = splitTime;
      timeLog.duration = splitMinutes;
      timeLog.adjustments.push({
        type: "split",
        amount: -1 * (timeLog.duration - splitMinutes),
        reason: `Split into time entry ${secondPart._id}`,
        timestamp: new Date(),
      });

      await timeLog.save();

      return {
        firstPart: timeLog,
        secondPart,
      };
    } catch (error) {
      logger.error(`Error splitting time entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Merge time entries
   */
  async mergeTimeEntries(userId, timeLogIds) {
    try {
      if (!Array.isArray(timeLogIds) || timeLogIds.length < 2) {
        throw new Error("Must provide at least two time entries to merge");
      }

      // Get all the time entries
      const timeLogs = await TimeLog.find({
        _id: { $in: timeLogIds },
        user: userId,
        isRunning: false, // Can only merge completed entries
      }).sort({ startTime: 1 });

      if (timeLogs.length !== timeLogIds.length) {
        throw new Error("One or more time entries not found");
      }

      if (timeLogs.some((t) => !t.endTime)) {
        throw new Error("Cannot merge entries without end times");
      }

      // Check if all entries are for the same task
      const taskId = timeLogs[0].task;
      if (!timeLogs.every((t) => t.task.toString() === taskId.toString())) {
        throw new Error("Can only merge time entries for the same task");
      }

      // Create the merged entry
      const mergedEntry = new TimeLog({
        task: taskId,
        user: userId,
        startTime: timeLogs[0].startTime,
        endTime: timeLogs[timeLogs.length - 1].endTime,
        duration: timeLogs.reduce((sum, t) => sum + t.duration, 0),
        isRunning: false,
        description: timeLogs[0].description,
        createdManually: false,
        tags: [...new Set(timeLogs.flatMap((t) => t.tags))], // Combine and deduplicate tags
        billable: timeLogs[0].billable,
        hourlyRate: timeLogs[0].hourlyRate,
        adjustments: [
          {
            type: "merge",
            amount: timeLogs.reduce((sum, t) => sum + t.duration, 0),
            reason: `Merged from time entries ${timeLogIds.join(", ")}`,
            timestamp: new Date(),
          },
        ],
      });

      await mergedEntry.save();

      // Delete the original entries
      await TimeLog.deleteMany({ _id: { $in: timeLogIds } });

      // Update task's total time
      await this.updateTaskTotalTime(taskId);

      return mergedEntry;
    } catch (error) {
      logger.error(`Error merging time entries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle bulk time entry operations
   */
  async bulkUpdateTimeEntries(userId, timeLogIds, updates) {
    try {
      if (!Array.isArray(timeLogIds) || timeLogIds.length === 0) {
        throw new Error("Must provide at least one time entry ID");
      }

      // Verify all entries belong to the user
      const count = await TimeLog.countDocuments({
        _id: { $in: timeLogIds },
        user: userId,
      });

      if (count !== timeLogIds.length) {
        throw new Error(
          "One or more time entries not found or don't belong to you"
        );
      }

      // Fields that can be updated in bulk
      const allowedUpdates = ["billable", "hourlyRate", "tags", "description"];

      // Filter out invalid updates
      const validUpdates = {};
      Object.keys(updates).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          validUpdates[key] = updates[key];
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        throw new Error("No valid updates provided");
      }

      // Update all the time entries
      const result = await TimeLog.updateMany(
        { _id: { $in: timeLogIds }, user: userId },
        { $set: validUpdates }
      );

      return {
        updated: result.nModified,
        total: timeLogIds.length,
      };
    } catch (error) {
      logger.error(`Error in bulk update time entries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Duplicate a time entry
   */
  async duplicateTimeEntry(userId, timeLogId) {
    try {
      const timeLog = await TimeLog.findOne({
        _id: timeLogId,
        user: userId,
      });

      if (!timeLog) {
        throw new Error("Time entry not found");
      }

      // Create new entry based on the original
      const newTimeLog = new TimeLog({
        task: timeLog.task,
        user: userId,
        startTime: new Date(),
        duration: timeLog.duration,
        isRunning: false,
        endTime: new Date(new Date().getTime() + timeLog.duration * 60 * 1000),
        description: `Copy of: ${timeLog.description}`,
        createdManually: true,
        tags: timeLog.tags,
        billable: timeLog.billable,
        hourlyRate: timeLog.hourlyRate,
      });

      await newTimeLog.save();

      // Update task's total time
      await this.updateTaskTotalTime(newTimeLog.task);

      return newTimeLog;
    } catch (error) {
      logger.error(`Error duplicating time entry: ${error.message}`);
      throw error;
    }
  }
}

export default new TimeTrackingService();
