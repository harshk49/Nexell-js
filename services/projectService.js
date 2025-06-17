const Project = require("../models/Project");
const Team = require("../models/Team");
const Task = require("../models/Task");
const User = require("../models/User");
const Comment = require("../models/Comment");
const logger = require("../utils/logger");

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(data, userId) {
    try {
      const project = new Project({
        ...data,
        owner: userId,
      });

      await project.save();
      return project;
    } catch (error) {
      logger.error(`Error creating project: ${error.message}`);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }, { members: userId }],
      })
        .populate("owner", "name email profilePicture")
        .populate("managers", "name email profilePicture")
        .populate("teams", "name description");

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      return project;
    } catch (error) {
      logger.error(`Error getting project: ${error.message}`);
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Get all projects for a user
   */
  async getProjects(userId, filters = {}, pagination = {}) {
    try {
      const { status, priority, search, startDate, dueDate, isArchived } =
        filters;
      const {
        page = 1,
        limit = 20,
        sortBy = "updatedAt",
        sortOrder = -1,
      } = pagination;

      const query = {
        $or: [{ owner: userId }, { managers: userId }, { members: userId }],
      };

      // Apply filters
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      if (startDate) query.startDate = { $gte: new Date(startDate) };
      if (dueDate) query.dueDate = { $lte: new Date(dueDate) };
      if (isArchived !== undefined) query.isArchived = isArchived;

      const sortOption = {};
      sortOption[sortBy] = sortOrder;

      const skip = (page - 1) * limit;

      const projects = await Project.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("owner", "name email profilePicture")
        .populate("teams", "name");

      const total = await Project.countDocuments(query);

      return {
        projects,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting projects: ${error.message}`);
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId, updates, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }],
      });

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      // Apply updates
      Object.keys(updates).forEach((key) => {
        // Handle nested fields like timeTracking.estimatedHours
        if (key.includes(".")) {
          const [parent, child] = key.split(".");
          if (!project[parent]) project[parent] = {};
          project[parent][child] = updates[key];
        } else {
          project[key] = updates[key];
        }
      });

      await project.save();
      return project;
    } catch (error) {
      logger.error(`Error updating project: ${error.message}`);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        owner: userId,
      });

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to delete it"
        );
      }

      // Mark as archived instead of deleting
      project.isArchived = true;
      await project.save();

      return { success: true, message: "Project archived successfully" };
    } catch (error) {
      logger.error(`Error deleting project: ${error.message}`);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Add a member to a project
   */
  async addMember(projectId, memberId, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }],
      });

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      // Validate user exists
      const user = await User.findById(memberId);
      if (!user) {
        throw new Error("User not found");
      }

      // Add member if not already in project
      if (!project.members.includes(memberId)) {
        project.members.push(memberId);
        await project.save();
      }

      return project;
    } catch (error) {
      logger.error(`Error adding member to project: ${error.message}`);
      throw new Error(`Failed to add member: ${error.message}`);
    }
  }

  /**
   * Remove a member from a project
   */
  async removeMember(projectId, memberId, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }],
      });

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      // Remove member
      project.members = project.members.filter(
        (id) => id.toString() !== memberId
      );
      await project.save();

      return project;
    } catch (error) {
      logger.error(`Error removing member from project: ${error.message}`);
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  /**
   * Add a team to a project
   */
  async addTeam(projectId, teamId, userId) {
    try {
      const [project, team] = await Promise.all([
        Project.findOne({
          _id: projectId,
          $or: [{ owner: userId }, { managers: userId }],
        }),
        Team.findById(teamId),
      ]);

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      if (!team) {
        throw new Error("Team not found");
      }

      // Add team if not already in project
      if (!project.teams.includes(teamId)) {
        project.teams.push(teamId);
        await project.save();
      }

      // Add project to team
      if (!team.projects.includes(projectId)) {
        team.projects.push(projectId);
        await team.save();
      }

      return project;
    } catch (error) {
      logger.error(`Error adding team to project: ${error.message}`);
      throw new Error(`Failed to add team: ${error.message}`);
    }
  }

  /**
   * Remove a team from a project
   */
  async removeTeam(projectId, teamId, userId) {
    try {
      const [project, team] = await Promise.all([
        Project.findOne({
          _id: projectId,
          $or: [{ owner: userId }, { managers: userId }],
        }),
        Team.findById(teamId),
      ]);

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      // Remove team from project
      project.teams = project.teams.filter((id) => id.toString() !== teamId);
      await project.save();

      if (team) {
        // Remove project from team
        team.projects = team.projects.filter(
          (id) => id.toString() !== projectId
        );
        await team.save();
      }

      return project;
    } catch (error) {
      logger.error(`Error removing team from project: ${error.message}`);
      throw new Error(`Failed to remove team: ${error.message}`);
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId, userId) {
    try {
      const project = await this.getProjectById(projectId, userId);

      // Get task stats
      const tasks = await Task.find({ project: projectId });

      const taskStats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === "completed").length,
        inProgress: tasks.filter((t) => t.status === "in-progress").length,
        notStarted: tasks.filter((t) => t.status === "not-started").length,
        overdue: tasks.filter(
          (t) => t.dueDate && t.dueDate < new Date() && t.status !== "completed"
        ).length,
      };

      // Calculate completion percentage
      const completionPercentage =
        taskStats.total > 0
          ? Math.round((taskStats.completed / taskStats.total) * 100)
          : 0;

      // Get time tracking stats
      const { actualHours, estimatedHours } = project.timeTracking;
      const timeProgress =
        estimatedHours > 0
          ? Math.round((actualHours / estimatedHours) * 100)
          : 0;

      return {
        taskStats,
        completionPercentage,
        timeTracking: {
          actualHours,
          estimatedHours,
          remainingHours: Math.max(0, estimatedHours - actualHours),
          progress: timeProgress,
        },
      };
    } catch (error) {
      logger.error(`Error getting project statistics: ${error.message}`);
      throw new Error(`Failed to get project statistics: ${error.message}`);
    }
  }

  /**
   * Add workflow automation rule
   */
  async addWorkflowAutomation(projectId, automation, userId) {
    try {
      const project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { managers: userId }],
      });

      if (!project) {
        throw new Error(
          "Project not found or you don't have permission to update it"
        );
      }

      // Validate automation structure
      const { trigger, condition, action, actionConfig } = automation;

      if (!trigger || !action) {
        throw new Error(
          "Invalid automation structure - missing required fields"
        );
      }

      project.workflow.automations.push(automation);
      await project.save();

      return project;
    } catch (error) {
      logger.error(`Error adding workflow automation: ${error.message}`);
      throw new Error(`Failed to add workflow automation: ${error.message}`);
    }
  }

  /**
   * Process workflow automation rules for an event
   */
  async processWorkflowAutomations(projectId, event, context) {
    try {
      const project = await Project.findById(projectId);

      if (!project || !project.workflow || !project.workflow.automations) {
        return { processed: false };
      }

      const { trigger, entityId, entityType, data } = event;

      // Find matching automation rules
      const matchingRules = project.workflow.automations.filter(
        (rule) =>
          rule.trigger === trigger &&
          this._evaluateCondition(rule.condition, data)
      );

      if (matchingRules.length === 0) {
        return { processed: false };
      }

      // Execute actions for matching rules
      const results = await Promise.all(
        matchingRules.map((rule) =>
          this._executeAutomationAction(rule, context)
        )
      );

      return {
        processed: true,
        results,
      };
    } catch (error) {
      logger.error(`Error processing workflow automations: ${error.message}`);
      throw new Error(
        `Failed to process workflow automations: ${error.message}`
      );
    }
  }

  // Private helper methods
  _evaluateCondition(condition, data) {
    // Simple condition evaluation
    if (!condition || Object.keys(condition).length === 0) {
      return true; // No condition means always true
    }

    try {
      // Check each condition property against data
      for (const [key, value] of Object.entries(condition)) {
        if (data[key] !== value) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error(`Condition evaluation error: ${error.message}`);
      return false;
    }
  }

  async _executeAutomationAction(rule, context) {
    const { action, actionConfig } = rule;
    const { entityId, entityType } = context;

    try {
      switch (action) {
        case "change_status":
          if (entityType === "Task") {
            const task = await Task.findById(entityId);
            if (task) {
              task.status = actionConfig.status;
              await task.save();
              return {
                success: true,
                action,
                message: `Task status updated to ${actionConfig.status}`,
              };
            }
          }
          break;

        case "notify":
          // Would integrate with notification system here
          return { success: true, action, message: "Notification triggered" };

        case "assign":
          if (entityType === "Task" && actionConfig.assigneeId) {
            const task = await Task.findById(entityId);
            if (task) {
              task.assignedTo = actionConfig.assigneeId;
              await task.save();
              return {
                success: true,
                action,
                message: `Task assigned to user`,
              };
            }
          }
          break;

        case "add_tag":
          if (entityType === "Task" && actionConfig.tag) {
            const task = await Task.findById(entityId);
            if (task && !task.tags.includes(actionConfig.tag)) {
              task.tags.push(actionConfig.tag);
              await task.save();
              return {
                success: true,
                action,
                message: `Tag ${actionConfig.tag} added to task`,
              };
            }
          }
          break;

        default:
          return { success: false, message: `Unsupported action: ${action}` };
      }

      return { success: false, message: "Action could not be executed" };
    } catch (error) {
      logger.error(`Execute automation action error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ProjectService();
