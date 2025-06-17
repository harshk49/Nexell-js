const membershipService = require("../services/membershipService");
const logger = require("../utils/logger");

class MembershipController {
  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(req, res) {
    try {
      const members = await membershipService.getOrganizationMembers(
        req.params.organizationId,
        req.query
      );

      res.json({
        message: "Members retrieved successfully",
        ...members,
      });
    } catch (error) {
      logger.error(`Get organization members error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching organization members",
        error: "MEMBER_FETCH_ERROR",
      });
    }
  }

  /**
   * Get a specific membership by ID
   */
  async getMembershipById(req, res) {
    try {
      const membership = await membershipService.getMembershipById(
        req.params.membershipId
      );

      res.json({
        message: "Membership retrieved successfully",
        membership,
      });
    } catch (error) {
      logger.error(`Get membership error: ${error.message}`);

      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "MEMBERSHIP_NOT_FOUND"
        : "MEMBERSHIP_FETCH_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Update a membership (role or title)
   */
  async updateMembership(req, res) {
    try {
      const membership = await membershipService.updateMembership(
        req.params.membershipId,
        req.user.userId,
        req.body
      );

      res.json({
        message: "Membership updated successfully",
        membership,
      });
    } catch (error) {
      logger.error(`Update membership error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "MEMBERSHIP_UPDATE_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "MEMBERSHIP_NOT_FOUND";
      } else if (error.message.includes("permission")) {
        errorStatus = 403;
        errorCode = "MEMBERSHIP_UPDATE_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(req, res) {
    try {
      await membershipService.removeMember(
        req.params.membershipId,
        req.user.userId
      );

      res.json({
        message: "Member removed successfully",
      });
    } catch (error) {
      logger.error(`Remove member error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "MEMBER_REMOVAL_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "MEMBERSHIP_NOT_FOUND";
      } else if (
        error.message.includes("permission") ||
        error.message.includes("cannot")
      ) {
        errorStatus = 403;
        errorCode = "MEMBER_REMOVAL_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Leave an organization
   */
  async leaveOrganization(req, res) {
    try {
      await membershipService.leaveOrganization(
        req.params.organizationId,
        req.user.userId
      );

      res.json({
        message: "Successfully left the organization",
      });
    } catch (error) {
      logger.error(`Leave organization error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "LEAVE_ORGANIZATION_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "MEMBERSHIP_NOT_FOUND";
      } else if (error.message.includes("last admin")) {
        errorStatus = 403;
        errorCode = "LEAVE_ORGANIZATION_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Set a user's current organization
   */
  async setCurrentOrganization(req, res) {
    try {
      await membershipService.setCurrentOrganization(
        req.params.organizationId,
        req.user.userId
      );

      res.json({
        message: "Current organization updated successfully",
      });
    } catch (error) {
      logger.error(`Set current organization error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "CURRENT_ORGANIZATION_UPDATE_ERROR";

      if (
        error.message.includes("not found") ||
        error.message.includes("not a member")
      ) {
        errorStatus = 404;
        errorCode = "ORGANIZATION_NOT_FOUND";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }
}

module.exports = new MembershipController();
