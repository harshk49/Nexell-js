import invitationService from "../services/invitationService.js";
import logger from "../utils/logger.js";

class InvitationController {
  /**
   * Create a new invitation to an organization
   */
  async createInvitation(req, res) {
    try {
      const invitation = await invitationService.createInvitation(
        req.user.userId,
        req.params.organizationId,
        req.body
      );

      res.status(201).json({
        message: "Invitation sent successfully",
        invitation,
      });
    } catch (error) {
      logger.error(`Invitation creation error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "INVITATION_CREATION_ERROR";

      if (
        error.message.includes("already a member") ||
        error.message.includes("already a pending")
      ) {
        errorStatus = 400;
        errorCode = "DUPLICATE_INVITATION";
      } else if (
        error.message.includes("permission") ||
        error.message.includes("Only admins")
      ) {
        errorStatus = 403;
        errorCode = "INVITATION_PERMISSION_DENIED";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get all invitations for an organization
   */
  async getOrganizationInvitations(req, res) {
    try {
      const invitations = await invitationService.getOrganizationInvitations(
        req.params.organizationId,
        req.query
      );

      res.json({
        message: "Invitations retrieved successfully",
        ...invitations,
      });
    } catch (error) {
      logger.error(`Get organization invitations error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching organization invitations",
        error: "INVITATION_FETCH_ERROR",
      });
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(req, res) {
    try {
      await invitationService.cancelInvitation(
        req.params.invitationId,
        req.user.userId
      );

      res.json({
        message: "Invitation cancelled successfully",
      });
    } catch (error) {
      logger.error(`Cancel invitation error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "INVITATION_CANCELLATION_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "INVITATION_NOT_FOUND";
      } else if (
        error.message.includes("permission") ||
        error.message.includes("cannot cancel")
      ) {
        errorStatus = 403;
        errorCode = "INVITATION_CANCELLATION_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(req, res) {
    try {
      const invitation = await invitationService.resendInvitation(
        req.params.invitationId,
        req.user.userId
      );

      res.json({
        message: "Invitation resent successfully",
        invitation,
      });
    } catch (error) {
      logger.error(`Resend invitation error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "INVITATION_RESEND_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "INVITATION_NOT_FOUND";
      } else if (error.message.includes("permission")) {
        errorStatus = 403;
        errorCode = "INVITATION_RESEND_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Accept an invitation (for the current user)
   */
  async acceptInvitation(req, res) {
    try {
      const { organization, membership } =
        await invitationService.acceptInvitation(
          req.params.token,
          req.user.userId
        );

      res.json({
        message: "Invitation accepted successfully",
        organization,
        membership,
      });
    } catch (error) {
      logger.error(`Accept invitation error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "INVITATION_ACCEPTANCE_ERROR";

      if (
        error.message.includes("not found") ||
        error.message.includes("expired")
      ) {
        errorStatus = 404;
        errorCode = "INVITATION_NOT_FOUND";
      } else if (error.message.includes("already a member")) {
        errorStatus = 400;
        errorCode = "ALREADY_MEMBER";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get all pending invitations for the current user
   */
  async getUserInvitations(req, res) {
    try {
      const invitations = await invitationService.getUserPendingInvitations(
        req.user.userId
      );

      res.json({
        message: "User invitations retrieved successfully",
        invitations,
      });
    } catch (error) {
      logger.error(`Get user invitations error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching user invitations",
        error: "USER_INVITATION_FETCH_ERROR",
      });
    }
  }
}

export default new InvitationController();
