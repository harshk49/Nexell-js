const Membership = require("../models/Membership");
const Organization = require("../models/Organization");
const User = require("../models/User");
const logger = require("../utils/logger");

class MembershipService {
  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId, query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "joinedAt",
        sortOrder = "desc",
        role,
      } = query;

      // Build query
      const queryObj = { organization: organizationId, status: "active" };

      if (role) {
        queryObj.role = role;
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Find memberships and populate user details
      const memberships = await Membership.find(queryObj)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate({
          path: "user",
          select: "username email firstName lastName avatar",
        })
        .populate({
          path: "invitedBy",
          select: "username firstName lastName",
        });

      // Get total count for pagination
      const total = await Membership.countDocuments(queryObj);

      // Format the response
      const members = memberships.map((membership) => ({
        id: membership._id,
        user: membership.user,
        role: membership.role,
        title: membership.title,
        status: membership.status,
        joinedAt: membership.joinedAt,
        invitedBy: membership.invitedBy,
        lastActive: membership.lastActive,
        permissions: membership.permissions,
      }));

      return {
        members,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching organization members: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific membership
   */
  async getMembershipById(membershipId) {
    try {
      const membership = await Membership.findById(membershipId)
        .populate({
          path: "user",
          select: "username email firstName lastName avatar",
        })
        .populate({
          path: "organization",
          select: "name description",
        })
        .populate({
          path: "invitedBy",
          select: "username firstName lastName",
        });

      if (!membership) {
        throw new Error("Membership not found");
      }

      return membership;
    } catch (error) {
      logger.error(`Error fetching membership: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a membership (role or status)
   */
  async updateMembership(membershipId, updatingUserId, updateData) {
    try {
      // Get the membership to be updated
      const membership = await Membership.findById(membershipId);

      if (!membership) {
        throw new Error("Membership not found");
      }

      // Get the updater's membership to check permissions
      const updaterMembership = await Membership.findOne({
        user: updatingUserId,
        organization: membership.organization,
        status: "active",
      });

      if (!updaterMembership) {
        throw new Error("You are not a member of this organization");
      }

      // Only admins can update memberships
      if (updaterMembership.role !== "admin") {
        throw new Error("Only organization admins can update memberships");
      }

      // Prevent demoting the last admin
      if (membership.role === "admin" && updateData.role !== "admin") {
        const adminCount = await Membership.countDocuments({
          organization: membership.organization,
          role: "admin",
          status: "active",
        });

        if (adminCount <= 1) {
          throw new Error("Cannot remove the last admin from the organization");
        }
      }

      // Only allow updating certain fields
      const allowedFields = ["role", "status", "title", "permissions"];
      const filteredUpdateData = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      }

      // Update the membership
      const updatedMembership = await Membership.findByIdAndUpdate(
        membershipId,
        { $set: filteredUpdateData },
        { new: true, runValidators: true }
      );

      // If status is being changed to inactive, update the user's current organization
      if (
        updateData.status === "inactive" &&
        membership.status !== "inactive"
      ) {
        const user = await User.findById(membership.user);

        if (
          user &&
          user.currentOrganization &&
          user.currentOrganization.toString() ===
            membership.organization.toString()
        ) {
          // Find another active organization for the user
          const anotherMembership = await Membership.findOne({
            user: membership.user,
            organization: { $ne: membership.organization },
            status: "active",
          });

          if (anotherMembership) {
            user.currentOrganization = anotherMembership.organization;
          } else {
            user.currentOrganization = undefined;
          }

          await user.save();
        }
      }

      logger.info(
        `Membership ${membershipId} updated by user ${updatingUserId}`
      );

      return updatedMembership;
    } catch (error) {
      logger.error(`Error updating membership: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId, userId, memberUserId) {
    try {
      // Check if the removing user is an admin
      const adminMembership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        role: "admin",
        status: "active",
      });

      if (!adminMembership) {
        throw new Error("Only organization admins can remove members");
      }

      // Check if the membership to remove exists
      const membershipToRemove = await Membership.findOne({
        user: memberUserId,
        organization: organizationId,
      });

      if (!membershipToRemove) {
        throw new Error("User is not a member of this organization");
      }

      // Users can't remove themselves (they should leave instead)
      if (userId === memberUserId) {
        throw new Error(
          "Cannot remove yourself from the organization. Use the leave organization feature instead"
        );
      }

      // Prevent removing the last admin
      if (membershipToRemove.role === "admin") {
        const adminCount = await Membership.countDocuments({
          organization: organizationId,
          role: "admin",
          status: "active",
        });

        if (adminCount <= 1) {
          throw new Error("Cannot remove the last admin from the organization");
        }
      }

      // Update the membership to inactive status
      const updatedMembership = await Membership.findByIdAndUpdate(
        membershipToRemove._id,
        { status: "inactive" },
        { new: true }
      );

      // Update the user's current organization if needed
      const user = await User.findById(memberUserId);

      if (
        user &&
        user.currentOrganization &&
        user.currentOrganization.toString() === organizationId
      ) {
        // Find another active organization for the user
        const anotherMembership = await Membership.findOne({
          user: memberUserId,
          organization: { $ne: organizationId },
          status: "active",
        });

        if (anotherMembership) {
          user.currentOrganization = anotherMembership.organization;
        } else {
          user.currentOrganization = undefined;
        }

        await user.save();
      }

      logger.info(
        `User ${memberUserId} removed from organization ${organizationId} by user ${userId}`
      );

      return updatedMembership;
    } catch (error) {
      logger.error(`Error removing member: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave an organization
   */
  async leaveOrganization(organizationId, userId) {
    try {
      // Check if the membership exists
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
      });

      if (!membership) {
        throw new Error("You are not a member of this organization");
      }

      // Prevent the last admin from leaving
      if (membership.role === "admin") {
        const adminCount = await Membership.countDocuments({
          organization: organizationId,
          role: "admin",
          status: "active",
        });

        if (adminCount <= 1) {
          throw new Error(
            "Cannot leave the organization as you are the last admin. Promote another member to admin first or delete the organization"
          );
        }
      }

      // Update the membership to inactive status
      const updatedMembership = await Membership.findByIdAndUpdate(
        membership._id,
        { status: "inactive" },
        { new: true }
      );

      // Update the user's current organization if needed
      const user = await User.findById(userId);

      if (
        user &&
        user.currentOrganization &&
        user.currentOrganization.toString() === organizationId
      ) {
        // Find another active organization for the user
        const anotherMembership = await Membership.findOne({
          user: userId,
          organization: { $ne: organizationId },
          status: "active",
        });

        if (anotherMembership) {
          user.currentOrganization = anotherMembership.organization;
        } else {
          user.currentOrganization = undefined;
        }

        await user.save();
      }

      logger.info(`User ${userId} left organization ${organizationId}`);

      return updatedMembership;
    } catch (error) {
      logger.error(`Error leaving organization: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new MembershipService();
