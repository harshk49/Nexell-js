import mongoose from "mongoose";

import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

// Email service for sending invitations (mock implementation)
const sendInvitationEmail = async (
  email,
  inviterName,
  organizationName,
  role,
  token,
  _message
) => {
  // In a real implementation, this would use nodemailer or similar to send an email
  logger.info(
    `Mock invitation email sent to ${email} for ${organizationName} with token ${token}`
  );
  return true;
};

class InvitationService {
  /**
   * Create a new invitation
   */
  async createInvitation(inviterId, organizationId, invitationData) {
    try {
      const { email, role, message } = invitationData;

      // Check if the inviter is a member with sufficient permissions
      const inviterMembership = await Membership.findOne({
        user: inviterId,
        organization: organizationId,
        status: "active",
      });

      if (!inviterMembership) {
        throw new Error("You are not a member of this organization");
      }

      // Check if user has permission to invite with the specified role
      if (inviterMembership.role !== "admin" && role === "admin") {
        throw new Error("Only admins can invite other admins");
      }

      // For non-admins, check organization settings
      if (inviterMembership.role !== "admin") {
        const organization = await Organization.findById(organizationId);
        if (!organization) {
          throw new Error("Organization not found");
        }

        const memberInvitePermission =
          organization.settings.permissions.memberInvite;
        if (memberInvitePermission === "admin") {
          throw new Error(
            "Only admins can invite members to this organization"
          );
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      // If user exists, check if they're already a member
      if (existingUser) {
        const existingMembership = await Membership.findOne({
          user: existingUser._id,
          organization: organizationId,
        });

        if (existingMembership && existingMembership.status === "active") {
          throw new Error("This user is already a member of the organization");
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await Invitation.findOne({
        email,
        organization: organizationId,
        status: "pending",
      });

      if (existingInvitation) {
        throw new Error("There is already a pending invitation for this email");
      }

      // Create new invitation
      const invitation = new Invitation({
        email,
        organization: organizationId,
        invitedBy: inviterId,
        role,
        message,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      await invitation.save();

      // Get inviter and organization details for the email
      const inviter = await User.findById(inviterId);
      const organization = await Organization.findById(organizationId);

      if (!inviter || !organization) {
        throw new Error("Failed to retrieve inviter or organization details");
      }

      // Send invitation email
      await sendInvitationEmail(
        email,
        inviter.firstName + " " + (inviter.lastName || ""),
        organization.name,
        role,
        invitation.token,
        message
      );

      logger.info(
        `Invitation sent to ${email} for organization ${organizationId} by user ${inviterId}`
      );

      return invitation;
    } catch (error) {
      logger.error(`Error creating invitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all invitations for an organization
   */
  async getOrganizationInvitations(organizationId, query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        status = "pending",
      } = query;

      // Build query
      const queryObj = { organization: organizationId };

      if (status) {
        queryObj.status = status;
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Find invitations and populate inviter details
      const invitations = await Invitation.find(queryObj)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate({
          path: "invitedBy",
          select: "username firstName lastName",
        });

      // Get total count for pagination
      const total = await Invitation.countDocuments(queryObj);

      return {
        invitations,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching organization invitations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId, userId) {
    try {
      // Find the invitation
      const invitation = await Invitation.findById(invitationId);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      if (invitation.status !== "pending") {
        throw new Error("Only pending invitations can be cancelled");
      }

      // Check if user has permission to cancel
      const userMembership = await Membership.findOne({
        user: userId,
        organization: invitation.organization,
        status: "active",
      });

      if (!userMembership) {
        throw new Error("You are not a member of this organization");
      }

      // Allow cancellation by the inviter or any admin
      if (
        invitation.invitedBy.toString() !== userId &&
        userMembership.role !== "admin"
      ) {
        throw new Error("You don't have permission to cancel this invitation");
      }

      // Update invitation status
      invitation.status = "cancelled";
      await invitation.save();

      logger.info(`Invitation ${invitationId} cancelled by user ${userId}`);

      return invitation;
    } catch (error) {
      logger.error(`Error cancelling invitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token, userId) {
    try {
      // Find the invitation
      const invitation = await Invitation.findOne({
        token,
        status: "pending",
      }).populate("organization", "name");

      if (!invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if invitation has expired
      if (new Date() > invitation.expiresAt) {
        invitation.status = "expired";
        await invitation.save();
        throw new Error("Invitation has expired");
      }

      // Get the current user and check if email matches
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.email !== invitation.email) {
        throw new Error(
          "This invitation was sent to a different email address"
        );
      }

      // Check if user already has a membership
      let membership = await Membership.findOne({
        user: userId,
        organization: invitation.organization,
      });

      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        if (membership) {
          // If membership exists but is inactive, reactivate it
          if (membership.status !== "active") {
            membership.status = "active";
            membership.role = invitation.role;
            membership.invitedBy = invitation.invitedBy;
            membership.joinedAt = new Date();
            await membership.save({ session });
          }
        } else {
          // Create new membership
          membership = new Membership({
            user: userId,
            organization: invitation.organization,
            role: invitation.role,
            status: "active",
            invitedBy: invitation.invitedBy,
            joinedAt: new Date(),
          });

          await membership.save({ session });

          // Add to user's organizations array
          await User.findByIdAndUpdate(
            userId,
            {
              $addToSet: { organizations: membership._id },
              $set: { currentOrganization: invitation.organization },
            },
            { session }
          );
        }

        // Update invitation status
        invitation.status = "accepted";
        await invitation.save({ session });

        await session.commitTransaction();

        logger.info(
          `User ${userId} accepted invitation to organization ${invitation.organization._id}`
        );

        return {
          organization: invitation.organization,
          membership,
          role: invitation.role,
        };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      logger.error(`Error accepting invitation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all invitations for a specific user by email
   */
  async getUserInvitations(email) {
    try {
      // Find all pending invitations for the user's email
      const invitations = await Invitation.find({
        email,
        status: "pending",
      })
        .populate({
          path: "organization",
          select: "name description logo",
        })
        .populate({
          path: "invitedBy",
          select: "username firstName lastName",
        });

      return invitations;
    } catch (error) {
      logger.error(`Error fetching user invitations: ${error.message}`);
      throw error;
    }
  }
}

export default new InvitationService();
