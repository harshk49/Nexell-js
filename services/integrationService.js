import Project from "../models/Project.js";
import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { formatDuration } from "../utils/timeUtils.js";

class IntegrationService {
  /**
   * Generate iCal format data for calendar integration
   */
  async generateCalendarData(userId, filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 1 week ago
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days ahead
        includeTimeLogs = true,
        includeTaskDueDates = true,
        includeProjectDates = true,
        limitToProjects = [],
      } = filters;

      const events = [];

      // Get time logs if requested
      if (includeTimeLogs) {
        const timeLogQuery = {
          user: userId,
          startTime: { $gte: startDate, $lte: endDate },
          duration: { $gt: 0 },
        };

        const timeLogs = await TimeLog.find(timeLogQuery)
          .populate({
            path: "task",
            select: "title project",
            populate: {
              path: "project",
              select: "name",
            },
          })
          .sort({ startTime: 1 });

        // Convert time logs to calendar events
        timeLogs.forEach((log) => {
          let projectName = "";
          let taskTitle = "Time Entry";

          if (log.task) {
            taskTitle = log.task.title;
            if (log.task.project) {
              projectName = log.task.project.name;

              // Skip if filtering by projects and this project is not included
              if (
                limitToProjects.length > 0 &&
                !limitToProjects.includes(log.task.project._id.toString())
              ) {
                return;
              }
            }
          }

          // Only include completed time entries
          if (log.endTime) {
            events.push({
              type: "timeLog",
              id: log._id.toString(),
              title: `${taskTitle}${log.description ? `: ${log.description}` : ""}`,
              description: log.description || taskTitle,
              project: projectName,
              start: log.startTime,
              end: log.endTime,
              duration: formatDuration(log.duration),
              isAllDay: false,
            });
          }
        });
      }

      // Get tasks with due dates if requested
      if (includeTaskDueDates) {
        const taskQuery = {
          $or: [{ owner: userId }, { assignedTo: userId }],
          dueDate: { $gte: startDate, $lte: endDate },
        };

        // Apply project filter if specified
        if (limitToProjects.length > 0) {
          taskQuery.project = { $in: limitToProjects };
        }

        const tasks = await Task.find(taskQuery)
          .populate("project", "name")
          .sort({ dueDate: 1 });

        // Convert tasks to calendar events
        tasks.forEach((task) => {
          let eventTitle = `Due: ${task.title}`;

          // Add project name if available
          if (task.project) {
            eventTitle = `[${task.project.name}] ${eventTitle}`;
          }

          // Create all-day event on the due date
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const endDate = new Date(dueDate);
          endDate.setDate(endDate.getDate() + 1);

          events.push({
            type: "taskDue",
            id: task._id.toString(),
            title: eventTitle,
            description: task.description || task.title,
            project: task.project ? task.project.name : "",
            start: dueDate,
            end: endDate,
            status: task.status,
            priority: task.priority,
            isAllDay: true,
          });
        });
      }

      // Get project milestone dates if requested
      if (includeProjectDates) {
        const projectQuery = {
          $or: [{ owner: userId }, { managers: userId }, { members: userId }],
          $and: [
            {
              $or: [
                { startDate: { $gte: startDate, $lte: endDate } },
                { dueDate: { $gte: startDate, $lte: endDate } },
              ],
            },
          ],
        };

        // Apply project filter if specified
        if (limitToProjects.length > 0) {
          projectQuery._id = { $in: limitToProjects };
        }

        const projects = await Project.find(projectQuery);

        // Convert project dates to calendar events
        projects.forEach((project) => {
          // Project start date
          if (
            project.startDate &&
            project.startDate >= startDate &&
            project.startDate <= endDate
          ) {
            events.push({
              type: "projectStart",
              id: `start-${project._id.toString()}`,
              title: `Start: ${project.name}`,
              description:
                project.description || `Project start: ${project.name}`,
              project: project.name,
              start: project.startDate,
              end: project.startDate,
              status: project.status,
              isAllDay: true,
            });
          }

          // Project due date
          if (
            project.dueDate &&
            project.dueDate >= startDate &&
            project.dueDate <= endDate
          ) {
            events.push({
              type: "projectDue",
              id: `due-${project._id.toString()}`,
              title: `Due: ${project.name}`,
              description:
                project.description || `Project due: ${project.name}`,
              project: project.name,
              start: project.dueDate,
              end: project.dueDate,
              status: project.status,
              isAllDay: true,
            });
          }
        });
      }

      // Sort all events by start date
      events.sort((a, b) => a.start - b.start);

      // Generate iCal format (simplified for demo)
      const icalContent = this._generateICalContent(events, userId);

      return {
        events,
        icalContent,
      };
    } catch (error) {
      logger.error(`Error generating calendar data: ${error.message}`);
      throw new Error(`Failed to generate calendar data: ${error.message}`);
    }
  }

  /**
   * Generate invoice data
   */
  async generateInvoiceData(userId, filters = {}) {
    try {
      const {
        startDate,
        endDate,
        projectId,
        clientId, // If implementing client model
        billableOnly = true,
        groupBy = "project", // project, task, day
      } = filters;

      // Build query
      const query = {
        user: userId,
      };

      if (startDate) {
        query.startTime = { $gte: new Date(startDate) };
      }
      if (endDate) {
        query.endTime = query.endTime || {};
        query.endTime.$lte = new Date(endDate);
      }
      if (billableOnly) {
        query.billable = true;
      }

      // Project filter
      if (projectId) {
        // Get all tasks for this project
        const tasks = await Task.find({ project: projectId });
        query.task = { $in: tasks.map((t) => t._id) };
      }

      // Get time entries
      const timeLogs = await TimeLog.find(query)
        .populate({
          path: "task",
          select: "title project customFields",
          populate: {
            path: "project",
            select: "name organization budget timeTracking",
          },
        })
        .sort({ startTime: 1 });

      // Prepare invoice data
      const invoiceItems = [];
      const groupedData = {};
      let totalBillable = 0;
      let totalAmount = 0;

      timeLogs.forEach((log) => {
        // Skip non-completed entries
        if (!log.endTime) return;

        const duration = log.duration || 0;
        const hourlyRate =
          log.hourlyRate || log.task?.project?.timeTracking?.rate || 0;

        const amount = Math.round((duration / 60) * hourlyRate * 100) / 100; // To 2 decimals

        totalBillable += duration;
        totalAmount += amount;

        // Group data based on groupBy parameter
        let groupKey = "Uncategorized";

        switch (groupBy) {
          case "project":
            groupKey = log.task?.project?.name || "No Project";
            break;
          case "task":
            groupKey = log.task?.title || "No Task";
            break;
          case "day":
            groupKey = log.startTime.toISOString().split("T")[0];
            break;
        }

        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            name: groupKey,
            duration: 0,
            amount: 0,
            entries: [],
          };
        }

        groupedData[groupKey].duration += duration;
        groupedData[groupKey].amount += amount;

        // Add entry details
        groupedData[groupKey].entries.push({
          date: log.startTime,
          description:
            log.description || `Work on ${log.task?.title || "task"}`,
          duration,
          durationFormatted: formatDuration(duration),
          rate: hourlyRate,
          amount,
        });
      });

      // Convert grouped data to array and sort
      const categories = Object.values(groupedData).map((group) => ({
        ...group,
        durationFormatted: formatDuration(group.duration),
        amountFormatted: `$${group.amount.toFixed(2)}`,
        hours: +(group.duration / 60).toFixed(2),
      }));

      // Sort categories
      if (groupBy === "day") {
        categories.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        categories.sort((a, b) => b.amount - a.amount);
      }

      return {
        timeRange: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
        summary: {
          totalDuration: totalBillable,
          totalDurationFormatted: formatDuration(totalBillable),
          totalHours: +(totalBillable / 60).toFixed(2),
          totalAmount,
          totalAmountFormatted: `$${totalAmount.toFixed(2)}`,
          entryCount: timeLogs.length,
          categoryCount: categories.length,
          currency: "USD", // Could be dynamic based on project settings
        },
        groupBy,
        categories,
      };
    } catch (error) {
      logger.error(`Error generating invoice data: ${error.message}`);
      throw new Error(`Failed to generate invoice data: ${error.message}`);
    }
  }

  /**
   * Generate data for Pomodoro timer visualization
   */
  async generatePomodoroStats(userId, timeRange = "week") {
    try {
      // Set date range based on timeRange parameter
      const startDate = new Date();
      const endDate = new Date();

      switch (timeRange) {
        case "day":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get Pomodoro sessions
      const timeLogs = await TimeLog.find({
        user: userId,
        startTime: { $gte: startDate, $lte: endDate },
        "pomodoro.enabled": true,
      }).populate("task", "title");

      // Process Pomodoro data
      const totalSessions = timeLogs.length;
      const completedSessions = timeLogs.filter(
        (log) => log.pomodoro.completedCount > 0
      ).length;
      let totalPomodoros = 0;
      let completedPomodoros = 0;
      let totalWorkTime = 0;
      let totalBreakTime = 0;

      const dailyStats = {};
      const taskStats = {};

      timeLogs.forEach((log) => {
        // Count pomodoros
        const sessionsCompleted = log.pomodoro.completedCount || 0;
        const sessionTarget = log.pomodoro.targetCount || 0;

        totalPomodoros += sessionTarget;
        completedPomodoros += sessionsCompleted;

        // Sum up work time (from duration) and break time
        totalWorkTime += log.duration || 0;

        // Calculate break time
        if (log.breaks && log.breaks.length > 0) {
          const breakDuration = log.breaks.reduce((total, breakItem) => {
            if (breakItem.endTime) {
              return (
                total +
                Math.floor((breakItem.endTime - breakItem.startTime) / 60000)
              );
            }
            return total;
          }, 0);
          totalBreakTime += breakDuration;
        }

        // Daily statistics
        const day = log.startTime.toISOString().split("T")[0];
        if (!dailyStats[day]) {
          dailyStats[day] = {
            date: day,
            sessions: 0,
            completed: 0,
            workMinutes: 0,
            breakMinutes: 0,
          };
        }

        dailyStats[day].sessions += 1;
        dailyStats[day].completed += sessionsCompleted > 0 ? 1 : 0;
        dailyStats[day].workMinutes += log.duration || 0;

        // Add break time to daily stats
        if (log.breaks && log.breaks.length > 0) {
          const breakDuration = log.breaks.reduce((total, breakItem) => {
            if (breakItem.endTime) {
              return (
                total +
                Math.floor((breakItem.endTime - breakItem.startTime) / 60000)
              );
            }
            return total;
          }, 0);
          dailyStats[day].breakMinutes += breakDuration;
        }

        // Stats by task
        if (log.task) {
          const taskId = log.task._id.toString();
          if (!taskStats[taskId]) {
            taskStats[taskId] = {
              taskId,
              title: log.task.title,
              sessions: 0,
              completed: 0,
              pomodorosCompleted: 0,
              workMinutes: 0,
            };
          }

          taskStats[taskId].sessions += 1;
          taskStats[taskId].completed += sessionsCompleted > 0 ? 1 : 0;
          taskStats[taskId].pomodorosCompleted += sessionsCompleted;
          taskStats[taskId].workMinutes += log.duration || 0;
        }
      });

      // Format data for return
      const dailyData = Object.values(dailyStats)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({
          ...day,
          workHours: +(day.workMinutes / 60).toFixed(2),
          breakHours: +(day.breakMinutes / 60).toFixed(2),
          completionRate:
            day.sessions > 0
              ? Math.round((day.completed / day.sessions) * 100)
              : 0,
        }));

      const taskData = Object.values(taskStats)
        .sort((a, b) => b.pomodorosCompleted - a.pomodorosCompleted)
        .map((task) => ({
          ...task,
          workHours: +(task.workMinutes / 60).toFixed(2),
          completionRate:
            task.sessions > 0
              ? Math.round((task.completed / task.sessions) * 100)
              : 0,
        }));

      return {
        timeRange,
        summary: {
          totalSessions,
          completedSessions,
          completionRate:
            totalSessions > 0
              ? Math.round((completedSessions / totalSessions) * 100)
              : 0,
          totalPomodoros,
          completedPomodoros,
          pomodoroCompletionRate:
            totalPomodoros > 0
              ? Math.round((completedPomodoros / totalPomodoros) * 100)
              : 0,
          totalWorkMinutes: totalWorkTime,
          totalWorkHours: +(totalWorkTime / 60).toFixed(2),
          totalBreakMinutes: totalBreakTime,
          totalBreakHours: +(totalBreakTime / 60).toFixed(2),
          avgSessionsPerDay:
            dailyData.length > 0
              ? +(totalSessions / dailyData.length).toFixed(2)
              : 0,
          avgWorkTimePerSession:
            totalSessions > 0 ? Math.round(totalWorkTime / totalSessions) : 0,
        },
        dailyStats: dailyData,
        taskStats: taskData,
        visualizationData: {
          dates: dailyData.map((d) => d.date),
          sessionsPerDay: dailyData.map((d) => d.sessions),
          completedPerDay: dailyData.map((d) => d.completed),
          workTimePerDay: dailyData.map((d) => d.workMinutes),
          breakTimePerDay: dailyData.map((d) => d.breakMinutes),
          taskLabels: taskData.slice(0, 10).map((t) => t.title), // Top 10 tasks
          taskPomodoros: taskData.slice(0, 10).map((t) => t.pomodorosCompleted),
          taskWorkTime: taskData.slice(0, 10).map((t) => t.workMinutes),
        },
      };
    } catch (error) {
      logger.error(`Error generating Pomodoro stats: ${error.message}`);
      throw new Error(
        `Failed to generate Pomodoro statistics: ${error.message}`
      );
    }
  }

  /**
   * Configure Pomodoro timer settings for a user
   * @param {String} userId - User ID
   * @param {Object} settings - Pomodoro settings
   */
  async configurePomodoroSettings(userId, settings) {
    try {
      // Validate settings
      const {
        enabled = true,
        workDuration = 25,
        shortBreakDuration = 5,
        longBreakDuration = 15,
        longBreakInterval = 4,
        autoStartBreaks = false,
        autoStartPomodoros = false,
        soundEnabled = true,
        soundVolume = 50,
        notification = true,
      } = settings;

      // Update user preferences
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Ensure user has preferences structure
      if (!user.preferences) {
        user.preferences = {};
      }

      if (!user.preferences.timeTracking) {
        user.preferences.timeTracking = {};
      }

      // Update Pomodoro settings
      user.preferences.timeTracking.pomodoro = {
        enabled,
        workDuration: Math.min(Math.max(1, workDuration), 120), // Between 1-120 minutes
        shortBreakDuration: Math.min(Math.max(1, shortBreakDuration), 30), // Between 1-30 minutes
        longBreakDuration: Math.min(Math.max(1, longBreakDuration), 60), // Between 1-60 minutes
        longBreakInterval: Math.min(Math.max(1, longBreakInterval), 10), // Between 1-10 intervals
        autoStartBreaks,
        autoStartPomodoros,
        soundEnabled,
        soundVolume: Math.min(Math.max(0, soundVolume), 100), // Between 0-100%
        notification,
      };

      await user.save();

      return user.preferences.timeTracking.pomodoro;
    } catch (error) {
      logger.error(`Error configuring Pomodoro settings: ${error.message}`);
      throw new Error(
        `Failed to configure Pomodoro settings: ${error.message}`
      );
    }
  }

  /**
   * Get Pomodoro timer settings for a user
   */
  async getPomodoroSettings(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Return default settings if not configured
      if (!user.preferences?.timeTracking?.pomodoro) {
        return {
          enabled: true,
          workDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStartBreaks: false,
          autoStartPomodoros: false,
          soundEnabled: true,
          soundVolume: 50,
          notification: true,
        };
      }

      return user.preferences.timeTracking.pomodoro;
    } catch (error) {
      logger.error(`Error getting Pomodoro settings: ${error.message}`);
      throw new Error(`Failed to get Pomodoro settings: ${error.message}`);
    }
  }

  /**
   * Export report data to different formats
   * @param {Object} data - Report data
   * @param {String} format - Export format (csv, excel, pdf)
   * @param {String} userId - User ID for reference
   * @returns {Object} - Export result with content type and data
   */
  async exportReport(data, format = "csv", userId) {
    try {
      const timestamp = new Date().toISOString().split("T")[0];
      let contentType, filename, exportData;

      switch (format.toLowerCase()) {
        case "csv":
          contentType = "text/csv";
          filename = `report-${timestamp}.csv`;
          exportData = this._generateCsvReport(data);
          break;

        case "excel":
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          filename = `report-${timestamp}.xlsx`;
          exportData = this._generateExcelReport(data);
          break;

        case "pdf":
          contentType = "application/pdf";
          filename = `report-${timestamp}.pdf`;
          exportData = this._generatePdfReport(data);
          break;

        default:
          throw new Error("Unsupported export format");
      }

      return {
        contentType,
        filename,
        data: exportData,
      };
    } catch (error) {
      logger.error(`Error exporting report: ${error.message}`);
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  // Helper methods for report export
  _generateCsvReport(data) {
    // Simple CSV generation for demo
    let csv = "Date,Description,Duration,Rate,Amount\n";

    data.categories.forEach((category) => {
      category.entries.forEach((entry) => {
        const date = new Date(entry.date).toISOString().split("T")[0];
        csv += `"${date}","${entry.description}",${entry.durationFormatted},${entry.rate},${entry.amount}\n`;
      });
    });

    return csv;
  }

  _generateExcelReport(data) {
    // In a real implementation, we would use a library like exceljs
    // For demo purposes, we'll return a placeholder
    return Buffer.from("Excel report data placeholder");
  }

  _generatePdfReport(data) {
    // In a real implementation, we would use a library like pdfkit
    // For demo purposes, we'll return a placeholder
    return Buffer.from("PDF report data placeholder");
  }

  // Private helper methods
  _generateICalContent(events, userId) {
    // Basic iCal format implementation
    // In production, we'd use a proper iCal library
    let ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NexEll//TimeTracker//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ].join("\r\n");

    // Add events
    events.forEach((event) => {
      const startDate = this._formatICalDate(event.start);
      const endDate = this._formatICalDate(event.end);

      ical += [
        "\r\nBEGIN:VEVENT",
        `UID:${event.id}@nexell.app`,
        `DTSTAMP:${this._formatICalDate(new Date())}`,
        `DTSTART${event.isAllDay ? ";VALUE=DATE" : ""}:${startDate}`,
        `DTEND${event.isAllDay ? ";VALUE=DATE" : ""}:${endDate}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ""}`,
        event.project ? `LOCATION:${event.project}` : "",
        "END:VEVENT",
      ].join("\r\n");
    });

    ical += "\r\nEND:VCALENDAR";
    return ical;
  }

  _formatICalDate(date) {
    if (!date) return "";

    const d = new Date(date);

    // Format for all-day events (just the date)
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      return d.toISOString().replace(/[-:]/g, "").split("T")[0];
    }

    // Format for time events (datetime with Z)
    return d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/g, "");
  }
}

export default new IntegrationService();
