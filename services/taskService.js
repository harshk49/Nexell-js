import Task from "../models/Task.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Task Service - Business logic for task operations
 */
class TaskService {
  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Newly created task
   */
  async createTask(taskData) {
    try {
      const task = new Task(taskData);

      // Validate the owner exists
      const owner = await User.findById(taskData.owner);
      if (!owner) {
        throw new Error("User not found");
      }

      await task.save();

      // Update user stats
      await User.findByIdAndUpdate(
        taskData.owner,
        { $inc: { createdTasks: 1 } },
        { new: true }
      );

      logger.info(`Task created with ID: ${task._id}`);
      return task;
    } catch (error) {
      logger.error(`Error creating task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tasks with pagination, filtering and sorting
   * @param {String} userId - User ID
   * @param {Object} query - Query parameters
   * @returns {Promise<Object>} Tasks and pagination info
   */
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
        dueDate,
        isArchived,
        isPinned,
        search,
        tags,
        assignedTo,
      } = query;

      // Build query object
      const queryObj = {
        $or: [{ owner: userId }, { assignedTo: userId }, { watchers: userId }],
      };

      // Add filters
      if (status) queryObj.status = status;
      if (priority) queryObj.priority = priority;
      if (category) queryObj.category = category;
      if (project) queryObj.project = project;
      if (isArchived !== undefined) queryObj.isArchived = isArchived === "true";
      if (isPinned !== undefined) queryObj.isPinned = isPinned === "true";
      if (assignedTo) queryObj.assignedTo = assignedTo;

      // Due date filtering
      if (dueDate) {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        switch (dueDate) {
          case "overdue":
            queryObj.dueDate = { $lt: today };
            queryObj.status = { $ne: "completed" };
            break;
          case "today":
            queryObj.dueDate = {
              $gte: today,
              $lt: tomorrow,
            };
            break;
          case "tomorrow":
            queryObj.dueDate = {
              $gte: tomorrow,
              $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
            };
            break;
          case "week":
            queryObj.dueDate = {
              $gte: today,
              $lt: nextWeek,
            };
            break;
          case "no-due-date":
            queryObj.dueDate = null;
            break;
        }
      }

      // Tag filtering
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(",");
        queryObj.tags = { $all: tagArray };
      }

      // Search functionality
      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        queryObj.$and = [
          queryObj.$or ? { $or: queryObj.$or } : {},
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { tags: searchRegex },
            ],
          },
        ];
        delete queryObj.$or;
      }

      // Setup sort options
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // For consistent pagination with changing data
      if (sortBy !== "_id") {
        sort._id = 1; // Secondary sort by _id for stable pagination
      }

      // Pagination and data retrieval
      const limitNum = parseInt(limit);
      const skip = (parseInt(page) - 1) * limitNum;

      // Execute query with lean() for better performance
      const tasks = await Task.find(queryObj)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("project", "name")
        .populate("parentTask", "title")
        .populate("assignedTo", "firstName lastName username avatar")
        .lean();

      // Count total matching documents
      const total = await Task.countDocuments(queryObj);

      return {
        tasks,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      };
    } catch (error) {
      logger.error(`Error fetching tasks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single task by ID
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Task
   */
  async getTaskById(taskId, userId) {
    try {
      const task = await Task.findOne({
        _id: taskId,
        $or: [{ owner: userId }, { assignedTo: userId }, { watchers: userId }],
      })
        .populate("project", "name")
        .populate("parentTask", "title")
        .populate("subtasks", "title status")
        .populate("dependencies", "title status")
        .populate("assignedTo", "firstName lastName username avatar")
        .populate("watchers", "firstName lastName username avatar")
        .populate({
          path: "comments.user",
          select: "firstName lastName username avatar",
        });

      if (!task) {
        throw new Error("Task not found");
      }

      return task;
    } catch (error) {
      logger.error(`Error fetching task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a task
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, userId, updateData) {
    try {
      // Check if the task exists and user has permission
      const task = await Task.findOne({
        _id: taskId,
        $or: [{ owner: userId }, { assignedTo: userId }],
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Check if user has permission to update (only owner or assigned user)
      if (
        task.owner.toString() !== userId &&
        (!task.assignedTo || task.assignedTo.toString() !== userId)
      ) {
        throw new Error("Unauthorized access");
      }

      // Check if status is changed to completed
      const statusChanged =
        updateData.status === "completed" && task.status !== "completed";

      // Update task
      Object.assign(task, updateData);

      // Add audit data
      task.updatedBy = userId;
      task.lastUpdated = new Date();

      // Save the updated task
      await task.save();

      // If task is now completed, update user stats
      if (statusChanged) {
        await User.findByIdAndUpdate(task.owner, {
          $inc: { completedTasks: 1 },
        });
      }

      // Return populated task
      return await Task.findById(taskId)
        .populate("project", "name")
        .populate("parentTask", "title")
        .populate("assignedTo", "firstName lastName username avatar");
    } catch (error) {
      logger.error(`Error updating task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a task
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Deleted task
   */
  async deleteTask(taskId, userId) {
    try {
      // Check if the task exists and user has permission to delete
      const task = await Task.findOne({
        _id: taskId,
        owner: userId, // Only owner can delete
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Check all subtasks and delete them
      await Task.deleteMany({ parentTask: taskId });

      // Remove this task as a dependency for other tasks
      await Task.updateMany(
        { dependencies: taskId },
        { $pull: { dependencies: taskId } }
      );

      // Delete task
      await task.remove();

      return task;
    } catch (error) {
      logger.error(`Error deleting task: ${error.message}`);
      throw error;
    }
  }
}

export default new TaskService();
