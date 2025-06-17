const timeTrackingService = require("../services/timeTrackingService");
const logger = require("../utils/logger");

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
}

module.exports = new TimeTrackingController();
