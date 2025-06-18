import mongoose from "mongoose";

import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";
import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

class ReportService {
  /**
   * Get time tracking report data
   *
   * @param {Object} filters - Query filters
   * @param {string} filters.userId - Filter by specific user ID
   * @param {string} filters.organizationId - Filter by organization ID
   * @param {string} filters.startDate - Start date (YYYY-MM-DD)
   * @param {string} filters.endDate - End date (YYYY-MM-DD)
   * @param {string} filters.groupBy - How to group results (day, week, month, user, task, category)
   * @returns {Array} - Report data
   */
  async getTimeTrackingReport(filters) {
    try {
      const {
        userId,
        organizationId,
        taskId,
        startDate,
        endDate,
        groupBy = "day",
        category,
        tags,
      } = filters;

      // Base match query
      const matchQuery = {};

      // Add date range filters if provided
      if (startDate || endDate) {
        matchQuery.date = {};
        if (startDate) {
          matchQuery.date.$gte = new Date(startDate);
        }
        if (endDate) {
          matchQuery.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }

      // Add user filter if provided
      if (userId) {
        matchQuery.user = mongoose.Types.ObjectId(userId);
      }

      // Add task filter if provided
      if (taskId) {
        matchQuery.task = mongoose.Types.ObjectId(taskId);
      }

      // Default group by day
      let groupByConfig = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        date: {
          $first: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        },
        totalDuration: { $sum: "$duration" },
        entries: { $push: "$$ROOT" },
      };

      // Configure grouping based on parameter
      switch (groupBy) {
        case "week":
          groupByConfig = {
            _id: { $dateToString: { format: "%G-W%V", date: "$date" } },
            startOfWeek: {
              $first: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      isoWeekYear: { $isoWeekYear: "$date" },
                      isoWeek: { $isoWeek: "$date" },
                      isoDayOfWeek: 1,
                    },
                  },
                },
              },
            },
            endOfWeek: {
              $first: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      isoWeekYear: { $isoWeekYear: "$date" },
                      isoWeek: { $isoWeek: "$date" },
                      isoDayOfWeek: 7,
                    },
                  },
                },
              },
            },
            totalDuration: { $sum: "$duration" },
            entries: { $push: "$$ROOT" },
          };
          break;
        case "month":
          groupByConfig = {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            month: {
              $first: { $dateToString: { format: "%Y-%m", date: "$date" } },
            },
            totalDuration: { $sum: "$duration" },
            entries: { $push: "$$ROOT" },
          };
          break;
        case "user":
          groupByConfig = {
            _id: "$user",
            userId: { $first: "$user" },
            totalDuration: { $sum: "$duration" },
            entries: { $push: "$$ROOT" },
          };
          break;
        case "task":
          groupByConfig = {
            _id: "$task",
            taskId: { $first: "$task" },
            totalDuration: { $sum: "$duration" },
            entries: { $push: "$$ROOT" },
          };
          break;
        case "category":
          // For category grouping, we need to join with tasks collection
          break;
      }

      // Build the pipeline based on groupBy
      let pipeline = [];

      // Initial match stage
      pipeline.push({ $match: matchQuery });

      // For category and tags, we need to lookup tasks first
      if (groupBy === "category" || category || tags) {
        pipeline = [
          ...pipeline,
          {
            $lookup: {
              from: "tasks",
              localField: "task",
              foreignField: "_id",
              as: "taskInfo",
            },
          },
          { $unwind: "$taskInfo" },
        ];

        // Add category filter if provided
        if (category) {
          pipeline.push({
            $match: { "taskInfo.category": category },
          });
        }

        // Add tags filter if provided
        if (tags && tags.length > 0) {
          pipeline.push({
            $match: { "taskInfo.tags": { $in: tags } },
          });
        }

        // If grouping by category
        if (groupBy === "category") {
          groupByConfig = {
            _id: "$taskInfo.category",
            category: { $first: "$taskInfo.category" },
            totalDuration: { $sum: "$duration" },
            entries: { $push: "$$ROOT" },
          };
        }
      }

      // Organization filter - we need to look up tasks and check the org
      if (organizationId) {
        if (!pipeline.some((stage) => Object.keys(stage)[0] === "$lookup")) {
          pipeline.push({
            $lookup: {
              from: "tasks",
              localField: "task",
              foreignField: "_id",
              as: "taskInfo",
            },
          });
          pipeline.push({ $unwind: "$taskInfo" });
        }

        pipeline.push({
          $match: {
            "taskInfo.organization": mongoose.Types.ObjectId(organizationId),
          },
        });
      }

      // Add group by stage
      pipeline.push({ $group: groupByConfig });

      // Sort by date or appropriate field
      if (groupBy === "day" || groupBy === "week" || groupBy === "month") {
        pipeline.push({ $sort: { _id: 1 } });
      } else if (groupBy === "user" || groupBy === "task") {
        pipeline.push({ $sort: { totalDuration: -1 } });
      } else if (groupBy === "category") {
        pipeline.push({ $sort: { category: 1 } });
      }

      // Remove unnecessary data from entries
      pipeline.push({
        $project: {
          _id: 0,
          entries: {
            $map: {
              input: "$entries",
              as: "entry",
              in: {
                _id: "$$entry._id",
                task: "$$entry.task",
                user: "$$entry.user",
                duration: "$$entry.duration",
                date: "$$entry.date",
                startTime: "$$entry.startTime",
                comment: "$$entry.comment",
              },
            },
          },
          totalHours: { $divide: ["$totalDuration", 60] },
          totalDuration: 1,
        },
      });

      // Add necessary fields based on groupBy
      if (groupBy === "day") {
        pipeline.push({
          $addFields: {
            date: "$date",
          },
        });
      } else if (groupBy === "week") {
        pipeline.push({
          $addFields: {
            week: "$_id",
            startDate: "$startOfWeek",
            endDate: "$endOfWeek",
          },
        });
      } else if (groupBy === "month") {
        pipeline.push({
          $addFields: {
            month: "$month",
          },
        });
      } else if (groupBy === "user") {
        pipeline.push({
          $addFields: {
            userId: "$userId",
          },
        });
      } else if (groupBy === "task") {
        pipeline.push({
          $addFields: {
            taskId: "$taskId",
          },
        });
      } else if (groupBy === "category") {
        pipeline.push({
          $addFields: {
            category: "$category",
          },
        });
      }

      // Execute the aggregation pipeline
      let results = await TimeLog.aggregate(pipeline);

      // For user grouping, populate user details
      if (groupBy === "user" && results.length > 0) {
        const userIds = results.map((item) => item.userId);
        const users = await User.find(
          {
            _id: { $in: userIds },
          },
          {
            _id: 1,
            username: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
          }
        );

        results = results.map((item) => {
          const user = users.find(
            (u) => u._id.toString() === item.userId.toString()
          );
          if (user) {
            return {
              ...item,
              user: {
                _id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                fullName: `${user.firstName} ${user.lastName || ""}`.trim(),
              },
            };
          }
          return item;
        });
      }

      // For task grouping, populate task details
      if (groupBy === "task" && results.length > 0) {
        const taskIds = results.map((item) => item.taskId);
        const tasks = await Task.find(
          {
            _id: { $in: taskIds },
          },
          {
            _id: 1,
            title: 1,
            status: 1,
            category: 1,
            priority: 1,
          }
        );

        results = results.map((item) => {
          const task = tasks.find(
            (t) => t._id.toString() === item.taskId.toString()
          );
          if (task) {
            return {
              ...item,
              task: {
                _id: task._id,
                title: task.title,
                status: task.status,
                category: task.category,
                priority: task.priority,
              },
            };
          }
          return item;
        });
      }

      return results;
    } catch (error) {
      logger.error(`Error generating time tracking report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get task completion report
   *
   * @param {Object} filters - Query filters
   * @param {string} filters.organizationId - Filter by organization ID
   * @param {string} filters.userId - Filter by user who completed the tasks
   * @param {string} filters.period - Report period (daily, weekly, monthly)
   * @param {string} filters.startDate - Start date (YYYY-MM-DD)
   * @param {string} filters.endDate - End date (YYYY-MM-DD)
   * @returns {Array} - Report data
   */
  async getTaskCompletionReport(filters) {
    try {
      const {
        organizationId,
        userId,
        period = "daily",
        startDate,
        endDate,
        groupBy = "date",
      } = filters;

      // Base match query - we're looking for completed tasks
      const matchQuery = {
        status: "completed",
      };

      // Add date range filters if provided (for the completedAt field)
      if (startDate || endDate) {
        matchQuery.completedAt = {};
        if (startDate) {
          matchQuery.completedAt.$gte = new Date(startDate);
        }
        if (endDate) {
          matchQuery.completedAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }

      // Add user filter if provided (for the owner field)
      if (userId) {
        matchQuery.owner = mongoose.Types.ObjectId(userId);
      }

      // Add organization filter if provided
      if (organizationId) {
        matchQuery.organization = mongoose.Types.ObjectId(organizationId);
      }

      // Default group by day
      let groupByConfig = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
        date: {
          $first: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
        },
        count: { $sum: 1 },
        tasks: { $push: "$$ROOT" },
      };

      // Configure grouping based on period parameter
      switch (period) {
        case "weekly":
          groupByConfig = {
            _id: { $dateToString: { format: "%G-W%V", date: "$completedAt" } },
            startOfWeek: {
              $first: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      isoWeekYear: { $isoWeekYear: "$completedAt" },
                      isoWeek: { $isoWeek: "$completedAt" },
                      isoDayOfWeek: 1,
                    },
                  },
                },
              },
            },
            endOfWeek: {
              $first: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      isoWeekYear: { $isoWeekYear: "$completedAt" },
                      isoWeek: { $isoWeek: "$completedAt" },
                      isoDayOfWeek: 7,
                    },
                  },
                },
              },
            },
            count: { $sum: 1 },
            tasks: { $push: "$$ROOT" },
          };
          break;
        case "monthly":
          groupByConfig = {
            _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } },
            month: {
              $first: {
                $dateToString: { format: "%Y-%m", date: "$completedAt" },
              },
            },
            count: { $sum: 1 },
            tasks: { $push: "$$ROOT" },
          };
          break;
      }

      // If grouping by user
      if (groupBy === "user") {
        groupByConfig = {
          _id: "$owner",
          userId: { $first: "$owner" },
          count: { $sum: 1 },
          tasks: { $push: "$$ROOT" },
        };
      } else if (groupBy === "category") {
        groupByConfig = {
          _id: "$category",
          category: { $first: "$category" },
          count: { $sum: 1 },
          tasks: { $push: "$$ROOT" },
        };
      } else if (groupBy === "priority") {
        groupByConfig = {
          _id: "$priority",
          priority: { $first: "$priority" },
          count: { $sum: 1 },
          tasks: { $push: "$$ROOT" },
        };
      }

      // Build the pipeline
      const pipeline = [{ $match: matchQuery }, { $group: groupByConfig }];

      // Sort appropriately based on group by
      if (
        ["date", "daily", "weekly", "monthly"].includes(groupBy) ||
        ["daily", "weekly", "monthly"].includes(period)
      ) {
        pipeline.push({ $sort: { _id: 1 } });
      } else if (
        groupBy === "user" ||
        groupBy === "category" ||
        groupBy === "priority"
      ) {
        pipeline.push({ $sort: { count: -1 } });
      }

      // Project relevant fields
      pipeline.push({
        $project: {
          _id: 0,
          tasks: {
            $map: {
              input: "$tasks",
              as: "task",
              in: {
                _id: "$$task._id",
                title: "$$task.title",
                status: "$$task.status",
                completedAt: "$$task.completedAt",
                owner: "$$task.owner",
                category: "$$task.category",
                priority: "$$task.priority",
                actualTime: "$$task.actualTime",
              },
            },
          },
          count: 1,
        },
      });

      // Add appropriate fields based on grouping
      if (period === "daily" || groupBy === "date") {
        pipeline.push({
          $addFields: {
            date: "$date",
          },
        });
      } else if (period === "weekly") {
        pipeline.push({
          $addFields: {
            week: "$_id",
            startDate: "$startOfWeek",
            endDate: "$endOfWeek",
          },
        });
      } else if (period === "monthly") {
        pipeline.push({
          $addFields: {
            month: "$month",
          },
        });
      } else if (groupBy === "user") {
        pipeline.push({
          $addFields: {
            userId: "$userId",
          },
        });
      } else if (groupBy === "category") {
        pipeline.push({
          $addFields: {
            category: "$category",
          },
        });
      } else if (groupBy === "priority") {
        pipeline.push({
          $addFields: {
            priority: "$priority",
          },
        });
      }

      // Execute the aggregation pipeline
      let results = await Task.aggregate(pipeline);

      // For user grouping, populate user details
      if (groupBy === "user" && results.length > 0) {
        const userIds = results.map((item) => item.userId);
        const users = await User.find(
          {
            _id: { $in: userIds },
          },
          {
            _id: 1,
            username: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
          }
        );

        results = results.map((item) => {
          const user = users.find(
            (u) => u._id.toString() === item.userId.toString()
          );
          if (user) {
            return {
              ...item,
              user: {
                _id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                fullName: `${user.firstName} ${user.lastName || ""}`.trim(),
              },
            };
          }
          return item;
        });
      }

      // Calculate efficiency metrics
      results = results.map((item) => {
        // Calculate total estimated vs actual time
        const totalEstimatedTime = item.tasks.reduce(
          (sum, task) => sum + (task.estimatedTime || 0),
          0
        );
        const totalActualTime = item.tasks.reduce(
          (sum, task) => sum + (task.actualTime || 0),
          0
        );

        // Calculate efficiency if we have both values
        let efficiency = null;
        if (totalEstimatedTime > 0 && totalActualTime > 0) {
          efficiency = parseFloat(
            (totalEstimatedTime / totalActualTime).toFixed(2)
          );
        }

        return {
          ...item,
          metrics: {
            totalEstimatedTime,
            totalActualTime,
            efficiency,
          },
        };
      });

      return results;
    } catch (error) {
      logger.error(`Error generating task completion report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a productivity overview report for an organization
   *
   * @param {String} organizationId - The organization ID
   * @param {String} startDate - Start date (YYYY-MM-DD)
   * @param {String} endDate - End date (YYYY-MM-DD)
   * @returns {Object} - Organization productivity report
   */
  async getOrganizationProductivityReport(organizationId, startDate, endDate) {
    try {
      // Ensure valid date formats
      const start = startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

      // Validate the organization exists
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Get active members in the organization
      const memberships = await Membership.find({
        organization: organizationId,
        status: "active",
      }).populate("user", "username firstName lastName email");

      const memberIds = memberships.map((m) => m.user._id);

      // Get task statistics
      const tasksStats = await Task.aggregate([
        {
          $match: {
            organization: mongoose.Types.ObjectId(organizationId),
            $and: [
              {
                $or: [
                  { owner: { $in: memberIds } },
                  { organization: mongoose.Types.ObjectId(organizationId) },
                ],
              },
              {
                $or: [
                  { createdAt: { $gte: start, $lte: end } },
                  { completedAt: { $gte: start, $lte: end } },
                  { updatedAt: { $gte: start, $lte: end } },
                ],
              }
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "completed"] },
                      { $gte: ["$completedAt", start] },
                      { $lte: ["$completedAt", end] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalTime: { $sum: { $ifNull: ["$actualTime", 0] } },
            avgCompletionTime: {
              $avg: {
                $cond: [
                  { $eq: ["$status", "completed"] },
                  { $ifNull: ["$actualTime", 0] },
                  null,
                ],
              },
            },
          },
        },
      ]);

      // Get time tracking statistics
      const timeStats = await TimeLog.aggregate([
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "taskInfo",
          },
        },
        { $unwind: "$taskInfo" },
        {
          $match: {
            date: { $gte: start, $lte: end },
            "taskInfo.organization": mongoose.Types.ObjectId(organizationId),
          },
        },
        {
          $group: {
            _id: null,
            totalTrackedTime: { $sum: "$duration" },
            totalEntries: { $sum: 1 },
            avgEntryDuration: { $avg: "$duration" },
          },
        },
      ]);

      // Get per-member statistics
      const memberStats = await Promise.all(
        memberIds.map(async (userId) => {
          // User's tasks
          const userTaskStats = await Task.aggregate([
            {
              $match: {
                owner: mongoose.Types.ObjectId(userId),
                organization: mongoose.Types.ObjectId(organizationId),
                $or: [
                  { createdAt: { $gte: start, $lte: end } },
                  { completedAt: { $gte: start, $lte: end } },
                  { updatedAt: { $gte: start, $lte: end } },
                ],
              },
            },
            {
              $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "completed"] },
                          { $gte: ["$completedAt", start] },
                          { $lte: ["$completedAt", end] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                totalTime: { $sum: { $ifNull: ["$actualTime", 0] } },
              },
            },
          ]);

          // User's time logs
          const userTimeStats = await TimeLog.aggregate([
            {
              $lookup: {
                from: "tasks",
                localField: "task",
                foreignField: "_id",
                as: "taskInfo",
              },
            },
            { $unwind: "$taskInfo" },
            {
              $match: {
                user: mongoose.Types.ObjectId(userId),
                date: { $gte: start, $lte: end },
                "taskInfo.organization":
                  mongoose.Types.ObjectId(organizationId),
              },
            },
            {
              $group: {
                _id: null,
                totalTrackedTime: { $sum: "$duration" },
                totalEntries: { $sum: 1 },
              },
            },
          ]);

          // Find the membership to get role info
          const membership = memberships.find(
            (m) => m.user._id.toString() === userId.toString()
          );

          return {
            user: membership
              ? {
                  _id: membership.user._id,
                  username: membership.user.username,
                  firstName: membership.user.firstName,
                  lastName: membership.user.lastName,
                  email: membership.user.email,
                  fullName:
                    `${membership.user.firstName} ${membership.user.lastName || ""}`.trim(),
                }
              : { _id: userId },
            role: membership ? membership.role : null,
            taskStats:
              userTaskStats.length > 0
                ? {
                    totalTasks: userTaskStats[0].totalTasks,
                    completedTasks: userTaskStats[0].completedTasks,
                    completionRate: userTaskStats[0].totalTasks
                      ? parseFloat(
                          (
                            (userTaskStats[0].completedTasks /
                              userTaskStats[0].totalTasks) *
                            100
                          ).toFixed(1)
                        )
                      : 0,
                    totalTime: userTaskStats[0].totalTime,
                  }
                : {
                    totalTasks: 0,
                    completedTasks: 0,
                    completionRate: 0,
                    totalTime: 0,
                  },
            timeStats:
              userTimeStats.length > 0
                ? {
                    totalTrackedMinutes: userTimeStats[0].totalTrackedTime,
                    totalTrackedHours: parseFloat(
                      (userTimeStats[0].totalTrackedTime / 60).toFixed(1)
                    ),
                    totalEntries: userTimeStats[0].totalEntries,
                  }
                : {
                    totalTrackedMinutes: 0,
                    totalTrackedHours: 0,
                    totalEntries: 0,
                  },
          };
        })
      );

      // Calculate daily activity over time
      const dailyActivity = await TimeLog.aggregate([
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "taskInfo",
          },
        },
        { $unwind: "$taskInfo" },
        {
          $match: {
            date: { $gte: start, $lte: end },
            "taskInfo.organization": mongoose.Types.ObjectId(organizationId),
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            date: {
              $first: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            },
            totalMinutes: { $sum: "$duration" },
            totalTasks: { $addToSet: "$task" },
          },
        },
        {
          $project: {
            _id: 0,
            date: 1,
            totalMinutes: 1,
            totalHours: { $divide: ["$totalMinutes", 60] },
            uniqueTasksCount: { $size: "$totalTasks" },
          },
        },
        { $sort: { date: 1 } },
      ]);

      // Calculate task status distribution
      const taskStatusDistribution = await Task.aggregate([
        {
          $match: {
            organization: mongoose.Types.ObjectId(organizationId),
            createdAt: { $lte: end },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Calculate tasks by category
      const tasksByCategory = await Task.aggregate([
        {
          $match: {
            organization: mongoose.Types.ObjectId(organizationId),
            category: { $exists: true, $ne: null },
            createdAt: { $lte: end },
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Build and return the final report
      return {
        organization: {
          _id: organization._id,
          name: organization.name,
          description: organization.description,
          memberCount: memberships.length,
        },
        reportPeriod: {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
        },
        overallStats: {
          tasks:
            tasksStats.length > 0
              ? {
                  totalTasks: tasksStats[0].totalTasks,
                  completedTasks: tasksStats[0].completedTasks,
                  completionRate: tasksStats[0].totalTasks
                    ? parseFloat(
                        (
                          (tasksStats[0].completedTasks /
                            tasksStats[0].totalTasks) *
                          100
                        ).toFixed(1)
                      )
                    : 0,
                  averageCompletionTimeMinutes: Math.round(
                    tasksStats[0].avgCompletionTime || 0
                  ),
                  totalTimeMinutes: tasksStats[0].totalTime,
                }
              : {
                  totalTasks: 0,
                  completedTasks: 0,
                  completionRate: 0,
                  averageCompletionTimeMinutes: 0,
                  totalTimeMinutes: 0,
                },
          timeTracking:
            timeStats.length > 0
              ? {
                  totalTrackedMinutes: timeStats[0].totalTrackedTime,
                  totalTrackedHours: parseFloat(
                    (timeStats[0].totalTrackedTime / 60).toFixed(1)
                  ),
                  totalEntries: timeStats[0].totalEntries,
                  avgEntryDurationMinutes: Math.round(
                    timeStats[0].avgEntryDuration || 0
                  ),
                }
              : {
                  totalTrackedMinutes: 0,
                  totalTrackedHours: 0,
                  totalEntries: 0,
                  avgEntryDurationMinutes: 0,
                },
        },
        memberStats: memberStats.sort(
          (a, b) =>
            (b.timeStats.totalTrackedMinutes || 0) -
            (a.timeStats.totalTrackedMinutes || 0)
        ),
        timeSeries: {
          dailyActivity,
        },
        distributions: {
          taskStatus: taskStatusDistribution,
          tasksByCategory,
        },
      };
    } catch (error) {
      logger.error(
        `Error generating organization productivity report: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Export report data to CSV format
   *
   * @param {Array} data - Report data to export
   * @param {String} reportType - Type of report (time, tasks, productivity)
   * @returns {String} - CSV formatted data
   */
  async exportToCsv(data, reportType) {
    try {
      let csvContent = "";
      let headers = [];
      const rows = [];

      // Format data based on report type
      switch (reportType) {
        case "time":
          headers = [
            "Date/Period",
            "Total Hours",
            "Total Minutes",
            "Number of Entries",
          ];

          data.forEach((item) => {
            const rowData = {};

            // Determine period field based on what's available
            if (item.date) rowData["Date/Period"] = item.date;
            else if (item.week)
              rowData["Date/Period"] = `${item.startDate} to ${item.endDate}`;
            else if (item.month) rowData["Date/Period"] = item.month;
            else if (item.user?.fullName)
              rowData["Date/Period"] = item.user.fullName;
            else if (item.task?.title) rowData["Date/Period"] = item.task.title;
            else if (item.category) rowData["Date/Period"] = item.category;
            else rowData["Date/Period"] = "Unknown";

            rowData["Total Hours"] = (item.totalDuration / 60).toFixed(2);
            rowData["Total Minutes"] = item.totalDuration;
            rowData["Number of Entries"] = item.entries.length;

            rows.push(rowData);
          });
          break;

        case "tasks":
          headers = [
            "Period",
            "Completed Tasks",
            "Completion Rate",
            "Total Estimated Time",
            "Total Actual Time",
            "Efficiency",
          ];

          data.forEach((item) => {
            const rowData = {};

            // Determine period field based on what's available
            if (item.date) rowData["Period"] = item.date;
            else if (item.week)
              rowData["Period"] = `${item.startDate} to ${item.endDate}`;
            else if (item.month) rowData["Period"] = item.month;
            else if (item.user?.fullName)
              rowData["Period"] = item.user.fullName;
            else if (item.category) rowData["Period"] = item.category;
            else if (item.priority) rowData["Period"] = item.priority;
            else rowData["Period"] = "Unknown";

            rowData["Completed Tasks"] = item.count;
            rowData["Total Estimated Time"] =
              (item.metrics?.totalEstimatedTime || 0) / 60;
            rowData["Total Actual Time"] =
              (item.metrics?.totalActualTime || 0) / 60;
            rowData["Efficiency"] = item.metrics?.efficiency || "N/A";

            rows.push(rowData);
          });
          break;

        case "productivity":
          headers = [
            "User",
            "Role",
            "Total Tasks",
            "Completed Tasks",
            "Completion Rate (%)",
            "Total Hours",
            "Time Entries",
          ];

          // Assuming data is the memberStats array from productivity report
          data.forEach((member) => {
            rows.push({
              User:
                member.user.fullName || member.user.username || "Unknown User",
              Role: member.role || "N/A",
              "Total Tasks": member.taskStats.totalTasks,
              "Completed Tasks": member.taskStats.completedTasks,
              "Completion Rate (%)": member.taskStats.completionRate,
              "Total Hours": member.timeStats.totalTrackedHours,
              "Time Entries": member.timeStats.totalEntries,
            });
          });
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Generate CSV header
      csvContent = headers.join(",") + "\r\n";

      // Generate CSV rows
      rows.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Handle values that might contain commas
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }
          return value === undefined || value === null ? "" : value;
        });
        csvContent += values.join(",") + "\r\n";
      });

      return csvContent;
    } catch (error) {
      logger.error(`Error exporting to CSV: ${error.message}`);
      throw error;
    }
  }
}

export default new ReportService();
