import organizationService from "../services/organizationService.js";
import logger from "../utils/logger.js";

class OrganizationController {
  /**
   * Create a new organization
   */
  async createOrganization(req, res) {
    try {
      const organization = await organizationService.createOrganization(
        req.user.userId,
        req.body
      );

      res.status(201).json({
        message: "Organization created successfully",
        organization,
      });
    } catch (error) {
      logger.error(`Organization creation error: ${error.message}`);
      res.status(500).json({
        message: "Error creating organization",
        error: "ORGANIZATION_CREATION_ERROR",
      });
    }
  }

  /**
   * Get all organizations for the current user
   */
  async getUserOrganizations(req, res) {
    try {
      const organizations = await organizationService.getUserOrganizations(
        req.user.userId
      );

      res.json({
        message: "Organizations retrieved successfully",
        organizations,
      });
    } catch (error) {
      logger.error(`Get organizations error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching organizations",
        error: "ORGANIZATION_FETCH_ERROR",
      });
    }
  }

  /**
   * Get a specific organization by ID
   */
  async getOrganizationById(req, res) {
    try {
      const organization = await organizationService.getOrganizationById(
        req.params.organizationId,
        req.user.userId
      );

      res.json({
        message: "Organization retrieved successfully",
        organization,
      });
    } catch (error) {
      logger.error(`Get organization error: ${error.message}`);

      const errorStatus = error.message.includes("not found") ? 404 : 500;
      const errorCode = error.message.includes("not found")
        ? "ORGANIZATION_NOT_FOUND"
        : "ORGANIZATION_FETCH_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Update an organization
   */
  async updateOrganization(req, res) {
    try {
      const organization = await organizationService.updateOrganization(
        req.params.organizationId,
        req.user.userId,
        req.body
      );

      res.json({
        message: "Organization updated successfully",
        organization,
      });
    } catch (error) {
      logger.error(`Update organization error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "ORGANIZATION_UPDATE_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "ORGANIZATION_NOT_FOUND";
      } else if (error.message.includes("Only organization admins")) {
        errorStatus = 403;
        errorCode = "INSUFFICIENT_PERMISSIONS";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Delete an organization
   */
  async deleteOrganization(req, res) {
    try {
      await organizationService.deleteOrganization(
        req.params.organizationId,
        req.user.userId
      );

      res.json({
        message: "Organization deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete organization error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "ORGANIZATION_DELETION_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "ORGANIZATION_NOT_FOUND";
      } else if (
        error.message.includes("permission") ||
        error.message.includes("cannot delete")
      ) {
        errorStatus = 403;
        errorCode = "ORGANIZATION_DELETION_FORBIDDEN";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Set current organization
   */
  async setCurrentOrganization(req, res) {
    try {
      const result = await organizationService.setCurrentOrganization(
        req.user.userId,
        req.params.organizationId
      );

      res.json({
        message: "Current organization set successfully",
        ...result,
      });
    } catch (error) {
      logger.error(`Set current organization error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "SET_CURRENT_ORGANIZATION_ERROR";

      if (error.message.includes("not a member")) {
        errorStatus = 403;
        errorCode = "NOT_ORGANIZATION_MEMBER";
      } else if (error.message.includes("User not found")) {
        errorStatus = 404;
        errorCode = "USER_NOT_FOUND";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }
}

export default new OrganizationController();
