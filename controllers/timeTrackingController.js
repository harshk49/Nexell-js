import timeTrackingService from "../services/timeTrackingService.js";
import logger from "../utils/logger.js";

class TimeTrackingController {
  /**
   * Start a timer for a task
   */
  async startTimer(req, res) {
    try {
      const { taskId } = req.params;
      const { description, stopRunningTimers = true } = req.body;

      const timeLog = await timeTrackingService.startTimer(
        req.user.userId,
        taskId,
        description,
        stopRunningTimers
      );

      res.status(201).json({
        message: "Timer started successfully",
        timeLog,
      });
    } catch (error) {
      logger.error(`Start timer error: ${error.message}`);
      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "TASK_NOT_FOUND"
        : "TIMER_START_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Stop a specific timer
   */
  async stopTimer(req, res) {
    try {
      const { timeLogId } = req.params;

      const timeLog = await timeTrackingService.stopTimer(
        req.user.userId,
        timeLogId
      );

      res.json({
        message: "Timer stopped successfully",
        timeLog,
      });
    } catch (error) {
      logger.error(`Stop timer error: ${error.message}`);
      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "TIMER_NOT_FOUND"
        : "TIMER_STOP_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Stop all running timers for a user
   */
  async stopAllTimers(req, res) {
    try {
      const stoppedTimers = await timeTrackingService.stopAllRunningTimers(
        req.user.userId
      );

      res.json({
        message: "All timers stopped successfully",
        count: stoppedTimers.length,
        timers: stoppedTimers,
      });
    } catch (error) {
      logger.error(`Stop all timers error: ${error.message}`);
      res.status(500).json({
        message: "Error stopping all timers",
        error: "TIMER_STOP_ALL_ERROR",
      });
    }
  }

  /**
   * Add a manual time entry
   */
  async addManualTimeEntry(req, res) {
    try {
      const { taskId } = req.params;
      const { startTime, endTime, description } = req.body;

      const timeLog = await timeTrackingService.addManualTimeEntry(
        req.user.userId,
        taskId,
        startTime,
        endTime,
        description
      );

      res.status(201).json({
        message: "Manual time entry added successfully",
        timeLog,
      });
    } catch (error) {
      logger.error(`Manual time entry error: ${error.message}`);
      let errorStatus = 500;
      let errorCode = "MANUAL_TIME_ENTRY_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "TASK_NOT_FOUND";
      } else if (
        error.message.includes("Invalid") ||
        error.message.includes("must be after")
      ) {
        errorStatus = 400;
        errorCode = "INVALID_TIME_RANGE";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get time logs for a task
   */
  async getTaskTimeLogs(req, res) {
    try {
      const { taskId } = req.params;
      const result = await timeTrackingService.getTimeLogsByTask(
        req.user.userId,
        taskId,
        req.query
      );

      res.json({
        message: "Time logs retrieved successfully",
        ...result,
      });
    } catch (error) {
      logger.error(`Get time logs error: ${error.message}`);
      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "TASK_NOT_FOUND"
        : "TIME_LOGS_FETCH_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get the currently running timer for a user
   */
  async getRunningTimer(req, res) {
    try {
      const runningTimer = await timeTrackingService.getRunningTimer(
        req.user.userId
      );

      if (!runningTimer) {
        return res.json({
          message: "No running timer found",
          runningTimer: null,
        });
      }

      res.json({
        message: "Running timer retrieved successfully",
        runningTimer,
      });
    } catch (error) {
      logger.error(`Get running timer error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching running timer",
        error: "RUNNING_TIMER_FETCH_ERROR",
      });
    }
  }

  /**
   * Get time tracking report for a user
   */
  async getUserTimeReport(req, res) {
    try {
      const report = await timeTrackingService.getUserTimeReport(
        req.user.userId,
        req.query
      );

      res.json({
        message: "Time report generated successfully",
        report,
      });
    } catch (error) {
      logger.error(`Time report error: ${error.message}`);
      res.status(500).json({
        message: "Error generating time report",
        error: "TIME_REPORT_ERROR",
      });
    }
  }

  /**
   * Delete a time log entry
   */
  async deleteTimeLog(req, res) {
    try {
      const { timeLogId } = req.params;

      const deletedTimeLog = await timeTrackingService.deleteTimeLog(
        req.user.userId,
        timeLogId
      );

      res.json({
        message: "Time log deleted successfully",
        timeLog: deletedTimeLog,
      });
    } catch (error) {
      logger.error(`Delete time log error: ${error.message}`);
      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "TIME_LOG_NOT_FOUND"
        : "TIME_LOG_DELETE_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get user's time tracking preferences
   */
  async getUserTimeTrackingPreferences(req, res) {
    try {
      const preferences =
        await timeTrackingService.getUserTimeTrackingPreferences(
          req.user.userId
        );

      res.json({
        preferences,
      });
    } catch (error) {
      logger.error(`Get time tracking preferences error: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve time tracking preferences",
        error: "PREFERENCES_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Update user's time tracking preferences
   */
  async updateTimeTrackingPreferences(req, res) {
    try {
      const { preferences } = req.body;

      const updatedPreferences =
        await timeTrackingService.updateTimeTrackingPreferences(
          req.user.userId,
          preferences
        );

      res.json({
        message: "Time tracking preferences updated successfully",
        preferences: updatedPreferences,
      });
    } catch (error) {
      logger.error(`Update time tracking preferences error: ${error.message}`);
      res.status(500).json({
        message: "Failed to update time tracking preferences",
        error: "PREFERENCES_UPDATE_ERROR",
      });
    }
  }

  /**
   * Handle idle time detection
   */
  async handleIdleTime(req, res) {
    try {
      const { timeLogId, idleTimeMinutes, action } = req.body;

      let result;
      switch (action) {
        case "keep":
          result = await timeTrackingService.keepIdleTime(
            req.user.userId,
            timeLogId,
            idleTimeMinutes
          );
          break;
        case "discard":
          result = await timeTrackingService.discardIdleTime(
            req.user.userId,
            timeLogId,
            idleTimeMinutes
          );
          break;
        case "stop":
          result = await timeTrackingService.stopTimerWithIdleAdjustment(
            req.user.userId,
            timeLogId,
            idleTimeMinutes
          );
          break;
        default:
          throw new Error("Invalid idle time action");
      }

      res.json({
        message: `Idle time handled successfully (${action})`,
        timeLog: result,
      });
    } catch (error) {
      logger.error(`Handle idle time error: ${error.message}`);
      res.status(500).json({
        message: "Failed to handle idle time",
        error: "IDLE_TIME_ERROR",
      });
    }
  }

  /**
   * Start a Pomodoro session
   */
  async startPomodoroSession(req, res) {
    try {
      const { taskId, pomodoroSettings } = req.body;

      const session = await timeTrackingService.startPomodoroSession(
        req.user.userId,
        taskId,
        pomodoroSettings
      );

      res.status(201).json({
        message: "Pomodoro session started successfully",
        session,
      });
    } catch (error) {
      logger.error(`Start Pomodoro session error: ${error.message}`);
      res.status(500).json({
        message: "Failed to start Pomodoro session",
        error: "POMODORO_START_ERROR",
      });
    }
  }

  /**
   * Complete current Pomodoro cycle
   */
  async completePomodoroSession(req, res) {
    try {
      const { timeLogId, completed } = req.body;

      const session = await timeTrackingService.completePomodoroSession(
        req.user.userId,
        timeLogId,
        completed
      );

      res.json({
        message: "Pomodoro session updated successfully",
        session,
      });
    } catch (error) {
      logger.error(`Complete Pomodoro session error: ${error.message}`);
      res.status(500).json({
        message: "Failed to update Pomodoro session",
        error: "POMODORO_UPDATE_ERROR",
      });
    }
  }

  /**
   * Start a break
   */
  async startBreak(req, res) {
    try {
      const { timeLogId, breakType } = req.body;

      const result = await timeTrackingService.startBreak(
        req.user.userId,
        timeLogId,
        breakType
      );

      res.status(201).json({
        message: "Break started successfully",
        break: result,
      });
    } catch (error) {
      logger.error(`Start break error: ${error.message}`);
      res.status(500).json({
        message: "Failed to start break",
        error: "BREAK_START_ERROR",
      });
    }
  }

  /**
   * End a break
   */
  async endBreak(req, res) {
    try {
      const { timeLogId, breakId } = req.body;

      const result = await timeTrackingService.endBreak(
        req.user.userId,
        timeLogId,
        breakId
      );

      res.json({
        message: "Break ended successfully",
        break: result,
      });
    } catch (error) {
      logger.error(`End break error: ${error.message}`);
      res.status(500).json({
        message: "Failed to end break",
        error: "BREAK_END_ERROR",
      });
    }
  }

  /**
   * Split a time entry
   */
  async splitTimeEntry(req, res) {
    try {
      const { timeLogId, splitTime } = req.body;

      const result = await timeTrackingService.splitTimeEntry(
        req.user.userId,
        timeLogId,
        new Date(splitTime)
      );

      res.status(201).json({
        message: "Time entry split successfully",
        timeLogs: result,
      });
    } catch (error) {
      logger.error(`Split time entry error: ${error.message}`);
      res.status(500).json({
        message: "Failed to split time entry",
        error: "TIME_ENTRY_SPLIT_ERROR",
      });
    }
  }

  /**
   * Merge time entries
   */
  async mergeTimeEntries(req, res) {
    try {
      const { timeLogIds } = req.body;

      const result = await timeTrackingService.mergeTimeEntries(
        req.user.userId,
        timeLogIds
      );

      res.status(200).json({
        message: "Time entries merged successfully",
        timeLog: result,
      });
    } catch (error) {
      logger.error(`Merge time entries error: ${error.message}`);
      res.status(500).json({
        message: "Failed to merge time entries",
        error: "TIME_ENTRIES_MERGE_ERROR",
      });
    }
  }

  /**
   * Duplicate a time entry
   */
  async duplicateTimeEntry(req, res) {
    try {
      const { timeLogId, adjustments } = req.body;

      const result = await timeTrackingService.duplicateTimeEntry(
        req.user.userId,
        timeLogId,
        adjustments
      );

      res.status(201).json({
        message: "Time entry duplicated successfully",
        timeLog: result,
      });
    } catch (error) {
      logger.error(`Duplicate time entry error: ${error.message}`);
      res.status(500).json({
        message: "Failed to duplicate time entry",
        error: "TIME_ENTRY_DUPLICATE_ERROR",
      });
    }
  }

  /**
   * Bulk update time entries
   */
  async bulkUpdateTimeEntries(req, res) {
    try {
      const { timeLogIds, updates } = req.body;

      const results = await timeTrackingService.bulkUpdateTimeEntries(
        req.user.userId,
        timeLogIds,
        updates
      );

      res.json({
        message: "Time entries updated successfully",
        timeLogs: results,
      });
    } catch (error) {
      logger.error(`Bulk update time entries error: ${error.message}`);
      res.status(500).json({
        message: "Failed to update time entries",
        error: "BULK_UPDATE_ERROR",
      });
    }
  }
}

export default new TimeTrackingController();
