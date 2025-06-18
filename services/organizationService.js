import mongoose from "mongoose";

import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";
import Note from "../models/Note.js";
import Organization from "../models/Organization.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(userId, organizationData) {
    try {
      // Create the organization
      const organization = new Organization({
        ...organizationData,
        createdBy: userId,
      });

      await organization.save();

      // Create an admin membership for the creator
      const membership = new Membership({
        user: userId,
        organization: organization._id,
        role: "admin",
        status: "active",
        invitedBy: userId,
      });

      await membership.save();

      // Update user's organizations and set as current
      await User.findByIdAndUpdate(userId, {
        $push: { organizations: membership._id },
        currentOrganization: organization._id,
      });

      logger.info(
        `Organization ${organization.name} created by user ${userId}`
      );

      return organization;
    } catch (error) {
      logger.error(`Error creating organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId) {
    try {
      // Find user's memberships and populate organization details
      const memberships = await Membership.find({
        user: userId,
        status: "active",
      })
        .populate({
          path: "organization",
          select: "name description logo website settings createdAt",
        })
        .sort({ "organization.name": 1 });

      // Extract organizations with role information
      const organizations = memberships.map((membership) => ({
        ...membership.organization.toObject(),
        role: membership.role,
        membershipId: membership._id,
      }));

      return organizations;
    } catch (error) {
      logger.error(`Error fetching user organizations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific organization by ID
   */
  async getOrganizationById(organizationId, userId) {
    try {
      // Find the organization
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new Error("Organization not found");
      }

      // Check if user is a member
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        status: "active",
      });

      if (!membership) {
        throw new Error("User is not a member of this organization");
      }

      // Get member count
      const memberCount = await Membership.countDocuments({
        organization: organizationId,
        status: "active",
      });

      // Get resource counts
      const taskCount = await Task.countDocuments({
        organization: organizationId,
      });
      const noteCount = await Note.countDocuments({
        organization: organizationId,
      });

      return {
        ...organization.toObject(),
        memberCount,
        taskCount,
        noteCount,
        userRole: membership.role,
      };
    } catch (error) {
      logger.error(`Error fetching organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an organization
   */
  async updateOrganization(organizationId, userId, updateData) {
    try {
      // Verify user's admin role first
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        role: "admin",
        status: "active",
      });

      if (!membership) {
        throw new Error(
          "Only organization admins can update organization details"
        );
      }

      // Don't allow updating certain fields
      const safeUpdateData = { ...updateData };
      delete safeUpdateData.createdBy;
      delete safeUpdateData.members;
      delete safeUpdateData.invitations;

      // Update the organization
      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      );

      if (!organization) {
        throw new Error("Organization not found");
      }

      logger.info(
        `Organization ${organization.name} updated by user ${userId}`
      );

      return organization;
    } catch (error) {
      logger.error(`Error updating organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an organization and all its data
   */
  async deleteOrganization(organizationId, userId) {
    try {
      // Verify user's admin role first
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        role: "admin",
        status: "active",
      });

      if (!membership) {
        throw new Error("Only organization admins can delete an organization");
      }

      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new Error("Organization not found");
      }

      // This will be a multi-step transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Delete all tasks in the organization
        await Task.deleteMany({ organization: organizationId }, { session });

        // Delete all notes in the organization
        await Note.deleteMany({ organization: organizationId }, { session });

        // Delete all invitations
        await Invitation.deleteMany(
          { organization: organizationId },
          { session }
        );

        // Find all memberships to update users
        const memberships = await Membership.find(
          { organization: organizationId },
          null,
          { session }
        );

        // Update all users to remove this organization
        for (const membership of memberships) {
          await User.updateOne(
            { _id: membership.user },
            {
              $pull: { organizations: membership._id },
              $unset: { currentOrganization: "" },
            },
            { session }
          );
        }

        // Delete all memberships
        await Membership.deleteMany(
          { organization: organizationId },
          { session }
        );

        // Delete the organization itself
        await Organization.findByIdAndDelete(organizationId, { session });

        await session.commitTransaction();

        logger.info(
          `Organization ${organization.name} deleted by user ${userId}`
        );

        return organization;
      } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      logger.error(`Error deleting organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set a user's current organization
   */
  async setCurrentOrganization(userId, organizationId) {
    try {
      // Verify user's membership
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        status: "active",
      });

      if (!membership) {
        throw new Error("User is not a member of this organization");
      }

      // Update user's current organization
      const user = await User.findByIdAndUpdate(
        userId,
        { currentOrganization: organizationId },
        { new: true }
      );

      if (!user) {
        throw new Error("User not found");
      }

      logger.info(
        `Current organization for user ${userId} set to ${organizationId}`
      );

      return {
        currentOrganization: organizationId,
        role: membership.role,
      };
    } catch (error) {
      logger.error(`Error setting current organization: ${error.message}`);
      throw error;
    }
  }
}

const organizationService = new OrganizationService();
export default organizationService;
