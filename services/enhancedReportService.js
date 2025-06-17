const TimeLog = require("../models/TimeLog");
const Task = require("../models/Task");
const User = require("../models/User");
const Project = require("../models/Project");
const Team = require("../models/Team");
const logger = require("../utils/logger");
const { formatDuration } = require("../utils/timeUtils");

class EnhancedReportService {
  /**
   * Generate time tracking reports with visualization data
   */
  async generateTimeTrackingReport(userId, filters = {}, groupBy = "day") {
    try {
      const {
        startDate,
        endDate,
        projectId,
        teamId,
        billableOnly,
        includeBreaks,
        taskId,
        tags,
      } = filters;

      // Build base query
      const query = { user: userId };

      // Apply date filters
      if (startDate) {
        query.startTime = { $gte: new Date(startDate) };
      }
      if (endDate) {
        query.endTime = query.endTime || {};
        query.endTime.$lte = new Date(endDate);
      }

      // Apply specific filters
      if (projectId) {
        query["task.project"] = projectId;
      }
      if (taskId) {
        query.task = taskId;
      }
      if (billableOnly) {
        query.billable = true;
      }
      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Get time logs
      let timeLogs = await TimeLog.find(query)
        .populate({
          path: "task",
          select: "title project",
          populate: {
            path: "project",
            select: "name",
          },
        })
        .sort({ startTime: 1 });

      // Filter by team if provided (requires checking tasks' projects)
      if (teamId) {
        const team = await Team.findById(teamId);
        if (!team) {
          throw new Error("Team not found");
        }

        const projectIds = team.projects.map((p) => p.toString());
        timeLogs = timeLogs.filter(
          (log) =>
            log.task &&
            log.task.project &&
            projectIds.includes(log.task.project._id.toString())
        );
      }

      // Format and process data
      let reportData = this._processTimeTrackingData(
        timeLogs,
        groupBy,
        includeBreaks
      );

      // Add visualization data
      reportData.visualizationData = this._generateVisualizationData(
        timeLogs,
        groupBy,
        includeBreaks
      );

      return reportData;
    } catch (error) {
      logger.error(`Error generating time tracking report: ${error.message}`);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate project-based reports
   */
  async generateProjectReport(projectId, filters = {}, userId) {
    try {
      const { startDate, endDate, includeMembers = true } = filters;

      // Validate project and user access
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }, { members: userId }],
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Build time log query
      const timeLogQuery = {};

      if (startDate) {
        timeLogQuery.startTime = { $gte: new Date(startDate) };
      }
      if (endDate) {
        timeLogQuery.endTime = timeLogQuery.endTime || {};
        timeLogQuery.endTime.$lte = new Date(endDate);
      }

      // Get all tasks for the project
      const tasks = await Task.find({ project: projectId });
      const taskIds = tasks.map((task) => task._id);

      timeLogQuery.task = { $in: taskIds };

      // Get time logs
      const timeLogs = await TimeLog.find(timeLogQuery)
        .populate("task", "title status priority")
        .populate("user", "name email profilePicture");

      // Group by user
      const userSummary = {};
      const taskSummary = {};
      const dailySummary = {};

      let totalDuration = 0;
      let billableDuration = 0;

      timeLogs.forEach((log) => {
        const userId = log.user._id.toString();
        const taskId = log.task._id.toString();
        const day = log.startTime.toISOString().split("T")[0];
        const duration = log.duration || 0;
        const billable = log.billable ? duration : 0;

        // Track totals
        totalDuration += duration;
        billableDuration += billable;

        // By user
        if (!userSummary[userId]) {
          userSummary[userId] = {
            user: {
              id: userId,
              name: log.user.name,
              email: log.user.email,
            },
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
          };
        }
        userSummary[userId].duration += duration;
        userSummary[userId].billableDuration += billable;
        userSummary[userId].entryCount += 1;

        // By task
        if (!taskSummary[taskId]) {
          taskSummary[taskId] = {
            task: {
              id: taskId,
              title: log.task.title,
              status: log.task.status,
            },
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
            userCount: new Set(),
          };
        }
        taskSummary[taskId].duration += duration;
        taskSummary[taskId].billableDuration += billable;
        taskSummary[taskId].entryCount += 1;
        taskSummary[taskId].userCount.add(userId);

        // By day
        if (!dailySummary[day]) {
          dailySummary[day] = {
            date: day,
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
            userCount: new Set(),
          };
        }
        dailySummary[day].duration += duration;
        dailySummary[day].billableDuration += billable;
        dailySummary[day].entryCount += 1;
        dailySummary[day].userCount.add(userId);
      });

      // Convert Sets to counts
      Object.values(taskSummary).forEach(
        (task) => (task.userCount = task.userCount.size)
      );
      Object.values(dailySummary).forEach(
        (day) => (day.userCount = day.userCount.size)
      );

      return {
        project: {
          id: project._id,
          name: project.name,
          status: project.status,
        },
        summary: {
          totalMinutes: totalDuration,
          billableMinutes: billableDuration,
          totalHours: +(totalDuration / 60).toFixed(2),
          billableHours: +(billableDuration / 60).toFixed(2),
          entryCount: timeLogs.length,
          taskCount: Object.keys(taskSummary).length,
          userCount: Object.keys(userSummary).length,
          billablePercentage: totalDuration
            ? +((billableDuration / totalDuration) * 100).toFixed(2)
            : 0,
        },
        userBreakdown: Object.values(userSummary)
          .sort((a, b) => b.duration - a.duration)
          .map((user) => ({
            ...user,
            duration: user.duration,
            durationFormatted: formatDuration(user.duration),
            billableDuration: user.billableDuration,
            billableDurationFormatted: formatDuration(user.billableDuration),
            billablePercentage: user.duration
              ? +((user.billableDuration / user.duration) * 100).toFixed(2)
              : 0,
          })),
        taskBreakdown: Object.values(taskSummary)
          .sort((a, b) => b.duration - a.duration)
          .map((task) => ({
            ...task,
            duration: task.duration,
            durationFormatted: formatDuration(task.duration),
            billableDuration: task.billableDuration,
            billableDurationFormatted: formatDuration(task.billableDuration),
            billablePercentage: task.duration
              ? +((task.billableDuration / task.duration) * 100).toFixed(2)
              : 0,
          })),
        dailyBreakdown: Object.values(dailySummary)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((day) => ({
            ...day,
            duration: day.duration,
            durationFormatted: formatDuration(day.duration),
            billableDuration: day.billableDuration,
            billableDurationFormatted: formatDuration(day.billableDuration),
            billablePercentage: day.duration
              ? +((day.billableDuration / day.duration) * 100).toFixed(2)
              : 0,
          })),
        visualizationData: {
          dailyData: Object.values(dailySummary)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((day) => ({
              date: day.date,
              minutes: day.duration,
              hours: +(day.duration / 60).toFixed(2),
              billableMinutes: day.billableDuration,
              billableHours: +(day.billableDuration / 60).toFixed(2),
            })),
          userDistribution: Object.values(userSummary).map((user) => ({
            userId: user.user.id,
            name: user.user.name,
            minutes: user.duration,
            hours: +(user.duration / 60).toFixed(2),
            percentage: totalDuration
              ? +((user.duration / totalDuration) * 100).toFixed(2)
              : 0,
          })),
          taskDistribution: Object.values(taskSummary).map((task) => ({
            taskId: task.task.id,
            title: task.task.title,
            status: task.task.status,
            minutes: task.duration,
            hours: +(task.duration / 60).toFixed(2),
            percentage: totalDuration
              ? +((task.duration / totalDuration) * 100).toFixed(2)
              : 0,
          })),
        },
      };
    } catch (error) {
      logger.error(`Error generating project report: ${error.message}`);
      throw new Error(`Failed to generate project report: ${error.message}`);
    }
  }

  /**
   * Generate team-based reports
   */
  async generateTeamReport(teamId, filters = {}, userId) {
    try {
      const { startDate, endDate, includeProjects = true } = filters;

      // Validate team and user access
      const team = await Team.findOne({
        _id: teamId,
        $or: [{ leader: userId }, { "members.user": userId }],
      }).populate("members.user", "name email profilePicture");

      if (!team) {
        throw new Error("Team not found or access denied");
      }

      // Get team member IDs
      const memberIds = team.members.map((member) => member.user._id);

      // Build time log query
      const query = {
        user: { $in: memberIds },
      };

      if (startDate) {
        query.startTime = { $gte: new Date(startDate) };
      }
      if (endDate) {
        query.endTime = query.endTime || {};
        query.endTime.$lte = new Date(endDate);
      }

      // Get all relevant projects for this team
      let projectFilter = {};
      if (includeProjects && team.projects.length > 0) {
        // Get tasks for team projects
        const tasks = await Task.find({
          project: { $in: team.projects },
        }).select("_id");
        const taskIds = tasks.map((task) => task._id);

        // Include both personal time logs and project task logs
        projectFilter = {
          $or: [{ task: { $in: taskIds } }, { user: { $in: memberIds } }],
        };
      } else {
        projectFilter = { user: { $in: memberIds } };
      }

      // Merge project filter with date filters
      const timeLogQuery = { ...query, ...projectFilter };

      // Get time logs
      const timeLogs = await TimeLog.find(timeLogQuery)
        .populate({
          path: "task",
          select: "title project",
          populate: {
            path: "project",
            select: "name",
          },
        })
        .populate("user", "name email profilePicture");

      // Process data
      const memberSummary = {};
      const projectSummary = {};
      const dailySummary = {};

      let totalDuration = 0;
      let billableDuration = 0;
      const projectSet = new Set();

      timeLogs.forEach((log) => {
        const userId = log.user._id.toString();
        const day = log.startTime.toISOString().split("T")[0];
        const duration = log.duration || 0;
        const billable = log.billable ? duration : 0;

        let projectId = "non-project";
        let projectName = "Non-Project Time";

        if (log.task && log.task.project) {
          projectId = log.task.project._id.toString();
          projectName = log.task.project.name;
          projectSet.add(projectId);
        }

        // Track totals
        totalDuration += duration;
        billableDuration += billable;

        // By member
        if (!memberSummary[userId]) {
          const memberData = team.members.find(
            (m) => m.user._id.toString() === userId
          );

          memberSummary[userId] = {
            user: {
              id: userId,
              name: log.user.name,
              email: log.user.email,
            },
            role: memberData ? memberData.role : "member",
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
            projectCount: new Set(),
          };
        }
        memberSummary[userId].duration += duration;
        memberSummary[userId].billableDuration += billable;
        memberSummary[userId].entryCount += 1;
        if (projectId !== "non-project") {
          memberSummary[userId].projectCount.add(projectId);
        }

        // By project
        if (!projectSummary[projectId]) {
          projectSummary[projectId] = {
            project: {
              id: projectId,
              name: projectName,
            },
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
            memberCount: new Set(),
          };
        }
        projectSummary[projectId].duration += duration;
        projectSummary[projectId].billableDuration += billable;
        projectSummary[projectId].entryCount += 1;
        projectSummary[projectId].memberCount.add(userId);

        // By day
        if (!dailySummary[day]) {
          dailySummary[day] = {
            date: day,
            duration: 0,
            billableDuration: 0,
            entryCount: 0,
            memberCount: new Set(),
          };
        }
        dailySummary[day].duration += duration;
        dailySummary[day].billableDuration += billable;
        dailySummary[day].entryCount += 1;
        dailySummary[day].memberCount.add(userId);
      });

      // Convert Sets to counts
      Object.values(memberSummary).forEach(
        (member) => (member.projectCount = member.projectCount.size)
      );
      Object.values(projectSummary).forEach(
        (project) => (project.memberCount = project.memberCount.size)
      );
      Object.values(dailySummary).forEach(
        (day) => (day.memberCount = day.memberCount.size)
      );

      const teamCapacityHours =
        team.timeTracking.capacity * team.members.length;
      const teamCapacityMinutes = teamCapacityHours * 60;

      // Calculate utilization for the period
      let utilization = 0;
      if (teamCapacityMinutes > 0) {
        // Adjust capacity for time period
        let dayCount = 0;
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          dayCount = (end - start) / (1000 * 60 * 60 * 24);
        } else {
          // Default to a week
          dayCount = 7;
        }

        // Calculate working days in period based on team schedule
        const workDaysPerWeek = team.workSchedule?.workDays?.length || 5;
        const adjustedDayCount = Math.max(1, (dayCount * workDaysPerWeek) / 7);

        // Calculate adjusted capacity
        const adjustedCapacityMinutes =
          (teamCapacityMinutes / 7) * adjustedDayCount;

        utilization = Math.min(
          100,
          Math.round((totalDuration / adjustedCapacityMinutes) * 100)
        );
      }

      return {
        team: {
          id: team._id,
          name: team.name,
          memberCount: team.members.length,
          capacity: teamCapacityHours,
        },
        summary: {
          totalMinutes: totalDuration,
          billableMinutes: billableDuration,
          totalHours: +(totalDuration / 60).toFixed(2),
          billableHours: +(billableDuration / 60).toFixed(2),
          entryCount: timeLogs.length,
          projectCount: projectSet.size,
          utilization: utilization,
          billablePercentage: totalDuration
            ? +((billableDuration / totalDuration) * 100).toFixed(2)
            : 0,
        },
        memberBreakdown: Object.values(memberSummary)
          .sort((a, b) => b.duration - a.duration)
          .map((member) => ({
            ...member,
            duration: member.duration,
            durationFormatted: formatDuration(member.duration),
            billableDuration: member.billableDuration,
            billableDurationFormatted: formatDuration(member.billableDuration),
            billablePercentage: member.duration
              ? +((member.billableDuration / member.duration) * 100).toFixed(2)
              : 0,
          })),
        projectBreakdown: Object.values(projectSummary)
          .sort((a, b) => b.duration - a.duration)
          .map((project) => ({
            ...project,
            duration: project.duration,
            durationFormatted: formatDuration(project.duration),
            billableDuration: project.billableDuration,
            billableDurationFormatted: formatDuration(project.billableDuration),
            billablePercentage: project.duration
              ? +((project.billableDuration / project.duration) * 100).toFixed(
                  2
                )
              : 0,
          })),
        dailyBreakdown: Object.values(dailySummary)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((day) => ({
            ...day,
            duration: day.duration,
            durationFormatted: formatDuration(day.duration),
            billableDuration: day.billableDuration,
            billableDurationFormatted: formatDuration(day.billableDuration),
            billablePercentage: day.duration
              ? +((day.billableDuration / day.duration) * 100).toFixed(2)
              : 0,
          })),
        visualizationData: {
          dailyData: Object.values(dailySummary)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((day) => ({
              date: day.date,
              minutes: day.duration,
              hours: +(day.duration / 60).toFixed(2),
              billableMinutes: day.billableDuration,
              billableHours: +(day.billableDuration / 60).toFixed(2),
              memberCount: day.memberCount,
            })),
          memberDistribution: Object.values(memberSummary).map((member) => ({
            userId: member.user.id,
            name: member.user.name,
            minutes: member.duration,
            hours: +(member.duration / 60).toFixed(2),
            percentage: totalDuration
              ? +((member.duration / totalDuration) * 100).toFixed(2)
              : 0,
          })),
          projectDistribution: Object.values(projectSummary).map((project) => ({
            projectId: project.project.id,
            name: project.project.name,
            minutes: project.duration,
            hours: +(project.duration / 60).toFixed(2),
            percentage: totalDuration
              ? +((project.duration / totalDuration) * 100).toFixed(2)
              : 0,
          })),
        },
      };
    } catch (error) {
      logger.error(`Error generating team report: ${error.message}`);
      throw new Error(`Failed to generate team report: ${error.message}`);
    }
  }

  /**
   * Export report to various formats (Excel, PDF, CSV)
   */
  async exportReport(reportData, format, userId) {
    try {
      // This would normally use libraries like ExcelJS or PDFKit
      // For simplicity, we'll just return the data formatted for export

      switch (format.toLowerCase()) {
        case "excel":
          return {
            format: "excel",
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename: `report-${Date.now()}.xlsx`,
            data: reportData, // This would be binary Excel data in production
          };

        case "pdf":
          return {
            format: "pdf",
            contentType: "application/pdf",
            filename: `report-${Date.now()}.pdf`,
            data: reportData, // This would be binary PDF data in production
          };

        case "csv":
        default:
          // Basic CSV conversion logic
          return {
            format: "csv",
            contentType: "text/csv",
            filename: `report-${Date.now()}.csv`,
            data: this._convertToCSV(reportData),
          };
      }
    } catch (error) {
      logger.error(`Error exporting report: ${error.message}`);
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  // Private helper methods
  _processTimeTrackingData(timeLogs, groupBy, includeBreaks) {
    // Group and calculate totals
    let groupedData = {};
    let totalDuration = 0;
    let billableDuration = 0;
    let breakDuration = 0;

    timeLogs.forEach((log) => {
      const duration = log.duration || 0;
      const billable = log.billable ? duration : 0;

      // Track totals
      totalDuration += duration;
      billableDuration += billable;

      // Track breaks if included
      if (includeBreaks && log.breaks && log.breaks.length > 0) {
        const logBreakDuration = log.breaks.reduce((total, breakItem) => {
          if (breakItem.endTime) {
            return (
              total +
              Math.floor((breakItem.endTime - breakItem.startTime) / 60000)
            );
          }
          return total;
        }, 0);
        breakDuration += logBreakDuration;
      }

      // Group by selected dimension
      let groupKey;
      switch (groupBy) {
        case "day":
          groupKey = log.startTime.toISOString().split("T")[0];
          break;
        case "week":
          // Get ISO week (YYYY-Www)
          const date = new Date(log.startTime);
          const year = date.getFullYear();
          const weekNum = this._getISOWeek(date);
          groupKey = `${year}-W${weekNum.toString().padStart(2, "0")}`;
          break;
        case "month":
          groupKey = log.startTime.toISOString().substring(0, 7); // YYYY-MM
          break;
        case "project":
          groupKey =
            log.task && log.task.project ? log.task.project.name : "No Project";
          break;
        case "task":
          groupKey = log.task ? log.task.title : "No Task";
          break;
        default:
          groupKey = log.startTime.toISOString().split("T")[0];
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          key: groupKey,
          duration: 0,
          billableDuration: 0,
          breakDuration: 0,
          entryCount: 0,
        };
      }

      groupedData[groupKey].duration += duration;
      groupedData[groupKey].billableDuration += billable;
      groupedData[groupKey].entryCount += 1;

      // Add break time if included
      if (includeBreaks && log.breaks && log.breaks.length > 0) {
        const logBreakDuration = log.breaks.reduce((total, breakItem) => {
          if (breakItem.endTime) {
            return (
              total +
              Math.floor((breakItem.endTime - breakItem.startTime) / 60000)
            );
          }
          return total;
        }, 0);
        groupedData[groupKey].breakDuration += logBreakDuration;
      }
    });

    // Format and prepare return data
    const groupedResults = Object.values(groupedData).map((group) => ({
      ...group,
      durationFormatted: formatDuration(group.duration),
      billableDurationFormatted: formatDuration(group.billableDuration),
      breakDurationFormatted: formatDuration(group.breakDuration),
      billablePercentage: group.duration
        ? +((group.billableDuration / group.duration) * 100).toFixed(2)
        : 0,
    }));

    // Sort results appropriately based on groupBy
    if (["day", "week", "month"].includes(groupBy)) {
      groupedResults.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      groupedResults.sort((a, b) => b.duration - a.duration);
    }

    return {
      summary: {
        totalMinutes: totalDuration,
        totalHours: +(totalDuration / 60).toFixed(2),
        totalFormatted: formatDuration(totalDuration),
        billableMinutes: billableDuration,
        billableHours: +(billableDuration / 60).toFixed(2),
        billableFormatted: formatDuration(billableDuration),
        breakMinutes: breakDuration,
        breakHours: +(breakDuration / 60).toFixed(2),
        breakFormatted: formatDuration(breakDuration),
        netMinutes: totalDuration - breakDuration,
        netHours: +((totalDuration - breakDuration) / 60).toFixed(2),
        netFormatted: formatDuration(totalDuration - breakDuration),
        billablePercentage: totalDuration
          ? +((billableDuration / totalDuration) * 100).toFixed(2)
          : 0,
        entryCount: timeLogs.length,
        groupCount: groupedResults.length,
      },
      groupBy,
      groups: groupedResults,
    };
  }

  _generateVisualizationData(timeLogs, groupBy, includeBreaks) {
    // Basic data processing for visualization
    const groupedData = {};

    timeLogs.forEach((log) => {
      let groupKey;
      switch (groupBy) {
        case "day":
          groupKey = log.startTime.toISOString().split("T")[0];
          break;
        case "week":
          const date = new Date(log.startTime);
          const year = date.getFullYear();
          const weekNum = this._getISOWeek(date);
          groupKey = `${year}-W${weekNum.toString().padStart(2, "0")}`;
          break;
        case "month":
          groupKey = log.startTime.toISOString().substring(0, 7); // YYYY-MM
          break;
        case "project":
          groupKey =
            log.task && log.task.project ? log.task.project.name : "No Project";
          break;
        case "task":
          groupKey = log.task ? log.task.title : "No Task";
          break;
        default:
          groupKey = log.startTime.toISOString().split("T")[0];
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          key: groupKey,
          minutes: 0,
          billableMinutes: 0,
          breakMinutes: 0,
        };
      }

      const duration = log.duration || 0;
      groupedData[groupKey].minutes += duration;
      groupedData[groupKey].billableMinutes += log.billable ? duration : 0;

      // Add break time if included
      if (includeBreaks && log.breaks && log.breaks.length > 0) {
        const breakDuration = log.breaks.reduce((total, breakItem) => {
          if (breakItem.endTime) {
            return (
              total +
              Math.floor((breakItem.endTime - breakItem.startTime) / 60000)
            );
          }
          return total;
        }, 0);
        groupedData[groupKey].breakMinutes += breakDuration;
      }
    });

    // Prepare data in format suitable for charts
    const chartData = Object.values(groupedData).map((group) => ({
      label: group.key,
      minutes: group.minutes,
      hours: +(group.minutes / 60).toFixed(2),
      billableMinutes: group.billableMinutes,
      billableHours: +(group.billableMinutes / 60).toFixed(2),
      breakMinutes: group.breakMinutes,
      breakHours: +(group.breakMinutes / 60).toFixed(2),
      netMinutes: group.minutes - group.breakMinutes,
      netHours: +((group.minutes - group.breakMinutes) / 60).toFixed(2),
    }));

    // Sort by time for chronological displays
    if (["day", "week", "month"].includes(groupBy)) {
      chartData.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      chartData.sort((a, b) => b.minutes - a.minutes);
    }

    return {
      chartType: ["day", "week", "month"].includes(groupBy) ? "line" : "bar",
      data: chartData,
      labels: chartData.map((item) => item.label),
      datasets: {
        total: chartData.map((item) => item.hours),
        billable: chartData.map((item) => item.billableHours),
        breaks: includeBreaks ? chartData.map((item) => item.breakHours) : [],
        net: includeBreaks ? chartData.map((item) => item.netHours) : [],
      },
    };
  }

  _getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  _convertToCSV(reportData) {
    // Basic CSV conversion logic
    // This would be more sophisticated in production

    let csv =
      "Group,Duration (min),Duration (hrs),Billable (min),Billable (hrs),Entries\n";

    if (reportData.groups) {
      reportData.groups.forEach((group) => {
        csv += `"${group.key}",${group.duration},${(group.duration / 60).toFixed(2)},${group.billableDuration},${(group.billableDuration / 60).toFixed(2)},${group.entryCount}\n`;
      });
    }

    return csv;
  }
}

module.exports = new EnhancedReportService();
