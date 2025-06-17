const Team = require("../models/Team");
const User = require("../models/User");
const Project = require("../models/Project");
const TimeLog = require("../models/TimeLog");
const logger = require("../utils/logger");

class TeamService {
  /**
   * Create a new team
   */
  async createTeam(data, userId) {
    try {
      const team = new Team({
        ...data,
        leader: userId,
        members: [{ user: userId, role: "lead" }],
      });

      await team.save();
      return team;
    } catch (error) {
      logger.error(`Error creating team: ${error.message}`);
      throw new Error(`Failed to create team: ${error.message}`);
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(teamId, userId) {
    try {
      // Check if user is part of team
      const team = await Team.findOne({
        _id: teamId,
        $or: [{ leader: userId }, { "members.user": userId }],
      })
        .populate("leader", "name email profilePicture")
        .populate("members.user", "name email profilePicture")
        .populate("projects", "name description status");

      if (!team) {
        throw new Error("Team not found or access denied");
      }

      return team;
    } catch (error) {
      logger.error(`Error getting team: ${error.message}`);
      throw new Error(`Failed to get team: ${error.message}`);
    }
  }

  /**
   * Get all teams for a user
   */
  async getTeams(userId, filters = {}, pagination = {}) {
    try {
      const { status, type, search } = filters;
      const {
        page = 1,
        limit = 20,
        sortBy = "updatedAt",
        sortOrder = -1,
      } = pagination;

      const query = {
        $or: [{ leader: userId }, { "members.user": userId }],
      };

      // Apply filters
      if (status) query.status = status;
      if (type) query.type = type;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const sortOption = {};
      sortOption[sortBy] = sortOrder;

      const skip = (page - 1) * limit;

      const teams = await Team.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("leader", "name email profilePicture")
        .populate("projects", "name");

      const total = await Team.countDocuments(query);

      return {
        teams,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting teams: ${error.message}`);
      throw new Error(`Failed to get teams: ${error.message}`);
    }
  }

  /**
   * Update a team
   */
  async updateTeam(teamId, updates, userId) {
    try {
      const team = await Team.findOne({
        _id: teamId,
        leader: userId,
      });

      if (!team) {
        throw new Error(
          "Team not found or you don't have permission to update it"
        );
      }

      // Apply updates
      Object.keys(updates).forEach((key) => {
        // Handle nested fields like timeTracking.capacity
        if (key.includes(".")) {
          const [parent, child] = key.split(".");
          if (!team[parent]) team[parent] = {};
          team[parent][child] = updates[key];
        } else {
          team[key] = updates[key];
        }
      });

      await team.save();
      return team;
    } catch (error) {
      logger.error(`Error updating team: ${error.message}`);
      throw new Error(`Failed to update team: ${error.message}`);
    }
  }

  /**
   * Add a member to a team
   */
  async addMember(teamId, memberId, role, userId) {
    try {
      const team = await Team.findOne({
        _id: teamId,
        leader: userId,
      });

      if (!team) {
        throw new Error(
          "Team not found or you don't have permission to update it"
        );
      }

      // Validate user exists
      const user = await User.findById(memberId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if already a member
      const existingMemberIndex = team.members.findIndex(
        (member) => member.user.toString() === memberId
      );

      if (existingMemberIndex >= 0) {
        // Update role if member already exists
        team.members[existingMemberIndex].role = role || "member";
      } else {
        // Add new member
        team.members.push({
          user: memberId,
          role: role || "member",
          joinedAt: new Date(),
        });
      }

      await team.save();
      return team;
    } catch (error) {
      logger.error(`Error adding member to team: ${error.message}`);
      throw new Error(`Failed to add member: ${error.message}`);
    }
  }

  /**
   * Remove a member from a team
   */
  async removeMember(teamId, memberId, userId) {
    try {
      const team = await Team.findOne({
        _id: teamId,
        leader: userId,
      });

      if (!team) {
        throw new Error(
          "Team not found or you don't have permission to update it"
        );
      }

      // Prevent removing the leader
      if (team.leader.toString() === memberId) {
        throw new Error(
          "Cannot remove team leader - transfer leadership first"
        );
      }

      // Remove member
      team.members = team.members.filter(
        (member) => member.user.toString() !== memberId
      );
      await team.save();

      return team;
    } catch (error) {
      logger.error(`Error removing member from team: ${error.message}`);
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  /**
   * Calculate and update team's utilization metrics
   */
  async updateTeamUtilization(teamId) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error("Team not found");
      }

      const utilization = await team.calculateUtilization();

      return {
        currentUtilization: utilization,
        target: team.timeTracking.utilizationTarget,
        capacity: team.timeTracking.capacity,
      };
    } catch (error) {
      logger.error(`Error updating team utilization: ${error.message}`);
      throw new Error(`Failed to update team utilization: ${error.message}`);
    }
  }

  /**
   * Get team workload distribution
   */
  async getTeamWorkloadDistribution(teamId, userId, timeRange = "week") {
    try {
      const team = await this.getTeamById(teamId, userId);

      const memberIds = team.members.map((member) => member.user._id);

      // Set date range based on timeRange parameter
      const startDate = new Date();
      const endDate = new Date();

      switch (timeRange) {
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get time entries for all team members
      const timeLogs = await TimeLog.find({
        user: { $in: memberIds },
        startTime: { $gte: startDate, $lte: endDate },
        duration: { $gt: 0 },
      }).populate("user", "name email");

      // Group and calculate minutes by user
      const workloadByUser = {};
      const workloadByProject = {};
      const workloadByDay = {};

      timeLogs.forEach((log) => {
        const userId = log.user._id.toString();
        const userName = log.user.name;

        // By user
        if (!workloadByUser[userId]) {
          workloadByUser[userId] = {
            userId,
            userName,
            minutes: 0,
            entryCount: 0,
          };
        }
        workloadByUser[userId].minutes += log.duration;
        workloadByUser[userId].entryCount += 1;

        // By project
        if (log.task && log.task.project) {
          const projectId = log.task.project.toString();
          if (!workloadByProject[projectId]) {
            workloadByProject[projectId] = {
              projectId,
              minutes: 0,
              entryCount: 0,
            };
          }
          workloadByProject[projectId].minutes += log.duration;
          workloadByProject[projectId].entryCount += 1;
        }

        // By day
        const day = log.startTime.toISOString().split("T")[0];
        if (!workloadByDay[day]) {
          workloadByDay[day] = {
            date: day,
            minutes: 0,
            entryCount: 0,
          };
        }
        workloadByDay[day].minutes += log.duration;
        workloadByDay[day].entryCount += 1;
      });

      return {
        timeRange,
        totalMinutes: timeLogs.reduce((sum, log) => sum + log.duration, 0),
        entryCount: timeLogs.length,
        byUser: Object.values(workloadByUser),
        byProject: Object.values(workloadByProject),
        byDay: Object.values(workloadByDay).sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      };
    } catch (error) {
      logger.error(
        `Error getting team workload distribution: ${error.message}`
      );
      throw new Error(`Failed to get team workload: ${error.message}`);
    }
  }

  /**
   * Transfer team leadership
   */
  async transferLeadership(teamId, newLeaderId, userId) {
    try {
      const team = await Team.findOne({
        _id: teamId,
        leader: userId,
      });

      if (!team) {
        throw new Error(
          "Team not found or you don't have permission to update it"
        );
      }

      // Verify new leader is a team member
      const isMember = team.members.some(
        (member) => member.user.toString() === newLeaderId
      );

      if (!isMember) {
        throw new Error("New leader must be an existing team member");
      }

      // Update leadership
      team.leader = newLeaderId;

      // Update member roles
      team.members.forEach((member) => {
        if (member.user.toString() === newLeaderId) {
          member.role = "lead";
        }
        if (member.user.toString() === userId && member.role === "lead") {
          member.role = "senior"; // Demote previous leader to senior
        }
      });

      await team.save();
      return team;
    } catch (error) {
      logger.error(`Error transferring team leadership: ${error.message}`);
      throw new Error(`Failed to transfer leadership: ${error.message}`);
    }
  }
}

module.exports = new TeamService();
