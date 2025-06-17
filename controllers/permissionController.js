const permissionService = require("../services/permissionService");
const logger = require("../utils/logger");

class PermissionController {
  /**
   * Get all custom roles for an organization
   */
  async getCustomRoles(req, res) {
    try {
      const organizationId = req.organizationId;
      const roles =
        await permissionService.getOrganizationRoles(organizationId);

      res.json(roles);
    } catch (error) {
      logger.error(`Error retrieving custom roles: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve custom roles",
        error: "ROLES_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Get a custom role by ID
   */
  async getCustomRoleById(req, res) {
    try {
      const { roleId } = req.params;
      const organizationId = req.organizationId;

      const role = await permissionService.getCustomRoleById(
        roleId,
        organizationId
      );

      res.json(role);
    } catch (error) {
      logger.error(`Error retrieving custom role: ${error.message}`);
      res.status(error.message.includes("not found") ? 404 : 500).json({
        message: error.message || "Failed to retrieve custom role",
        error: "ROLE_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Create a new custom role
   */
  async createCustomRole(req, res) {
    try {
      const roleData = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.userId;

      const role = await permissionService.createCustomRole(
        organizationId,
        roleData,
        userId
      );

      res.status(201).json({
        message: "Custom role created successfully",
        role,
      });
    } catch (error) {
      logger.error(`Error creating custom role: ${error.message}`);
      res.status(error.message.includes("already exists") ? 400 : 500).json({
        message: error.message || "Failed to create custom role",
        error: "ROLE_CREATION_ERROR",
      });
    }
  }

  /**
   * Update a custom role
   */
  async updateCustomRole(req, res) {
    try {
      const { roleId } = req.params;
      const updates = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.userId;

      const role = await permissionService.updateCustomRole(
        roleId,
        organizationId,
        updates,
        userId
      );

      res.json({
        message: "Custom role updated successfully",
        role,
      });
    } catch (error) {
      logger.error(`Error updating custom role: ${error.message}`);
      res
        .status(
          error.message.includes("not found")
            ? 404
            : error.message.includes("cannot be modified")
              ? 400
              : 500
        )
        .json({
          message: error.message || "Failed to update custom role",
          error: "ROLE_UPDATE_ERROR",
        });
    }
  }

  /**
   * Delete a custom role
   */
  async deleteCustomRole(req, res) {
    try {
      const { roleId } = req.params;
      const { newRoleId } = req.body;
      const organizationId = req.organizationId;

      const result = await permissionService.deleteCustomRole(
        roleId,
        organizationId,
        newRoleId
      );

      res.json(result);
    } catch (error) {
      logger.error(`Error deleting custom role: ${error.message}`);
      res
        .status(
          error.message.includes("not found")
            ? 404
            : error.message.includes("cannot be deleted") ||
                error.message.includes("replacement role")
              ? 400
              : 500
        )
        .json({
          message: error.message || "Failed to delete custom role",
          error: "ROLE_DELETION_ERROR",
        });
    }
  }

  /**
   * Set resource-specific permission override for a role
   */
  async setResourcePermissionOverride(req, res) {
    try {
      const { roleId } = req.params;
      const { resourceType, resourceId, permissions } = req.body;
      const organizationId = req.organizationId;

      const role = await permissionService.setResourcePermissionOverride(
        roleId,
        organizationId,
        resourceType,
        resourceId,
        permissions
      );

      res.json({
        message: "Resource permission override set successfully",
        role,
      });
    } catch (error) {
      logger.error(
        `Error setting resource permission override: ${error.message}`
      );
      res.status(error.message.includes("not found") ? 404 : 500).json({
        message: error.message || "Failed to set permission override",
        error: "PERMISSION_OVERRIDE_ERROR",
      });
    }
  }

  /**
   * Get all permission templates
   */
  async getPermissionTemplates(req, res) {
    try {
      const organizationId = req.organizationId;
      const templates =
        await permissionService.getPermissionTemplates(organizationId);

      res.json(templates);
    } catch (error) {
      logger.error(`Error retrieving permission templates: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve permission templates",
        error: "TEMPLATES_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Get a permission template by ID
   */
  async getPermissionTemplateById(req, res) {
    try {
      const { templateId } = req.params;
      const organizationId = req.organizationId;

      const template = await permissionService.getPermissionTemplateById(
        templateId,
        organizationId
      );

      res.json(template);
    } catch (error) {
      logger.error(`Error retrieving permission template: ${error.message}`);
      res.status(error.message.includes("not found") ? 404 : 500).json({
        message: error.message || "Failed to retrieve permission template",
        error: "TEMPLATE_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Create a new permission template
   */
  async createPermissionTemplate(req, res) {
    try {
      const templateData = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.userId;

      const template = await permissionService.createPermissionTemplate(
        organizationId,
        templateData,
        userId
      );

      res.status(201).json({
        message: "Permission template created successfully",
        template,
      });
    } catch (error) {
      logger.error(`Error creating permission template: ${error.message}`);
      res.status(error.message.includes("already exists") ? 400 : 500).json({
        message: error.message || "Failed to create permission template",
        error: "TEMPLATE_CREATION_ERROR",
      });
    }
  }

  /**
   * Update a permission template
   */
  async updatePermissionTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const updates = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.userId;

      const template = await permissionService.updatePermissionTemplate(
        templateId,
        organizationId,
        updates,
        userId
      );

      res.json({
        message: "Permission template updated successfully",
        template,
      });
    } catch (error) {
      logger.error(`Error updating permission template: ${error.message}`);
      res.status(error.message.includes("not found") ? 404 : 500).json({
        message: error.message || "Failed to update permission template",
        error: "TEMPLATE_UPDATE_ERROR",
      });
    }
  }

  /**
   * Delete a permission template
   */
  async deletePermissionTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const organizationId = req.organizationId;

      const result = await permissionService.deletePermissionTemplate(
        templateId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error(`Error deleting permission template: ${error.message}`);
      res
        .status(
          error.message.includes("not found")
            ? 404
            : error.message.includes("cannot be deleted")
              ? 400
              : 500
        )
        .json({
          message: error.message || "Failed to delete permission template",
          error: "TEMPLATE_DELETION_ERROR",
        });
    }
  }

  /**
   * Apply a permission template to a resource
   */
  async applyPermissionTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { resourceType, resourceId } = req.body;
      const organizationId = req.organizationId;
      const userId = req.user.userId;

      const result = await permissionService.applyPermissionTemplate(
        organizationId,
        templateId,
        resourceType,
        resourceId,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error(`Error applying permission template: ${error.message}`);
      res
        .status(
          error.message.includes("not found")
            ? 404
            : error.message.includes("not applicable")
              ? 400
              : 500
        )
        .json({
          message: error.message || "Failed to apply permission template",
          error: "TEMPLATE_APPLICATION_ERROR",
        });
    }
  }

  /**
   * Check if user has permission on a resource
   */
  async checkResourcePermission(req, res) {
    try {
      const userId = req.user.userId;
      const organizationId = req.organizationId;
      const { resourceType, resourceId, permission } = req.query;

      if (!resourceType || !resourceId || !permission) {
        return res.status(400).json({
          message: "Missing required parameters",
          error: "MISSING_PARAMETERS",
        });
      }

      const hasPermission = await permissionService.checkResourcePermission(
        userId,
        organizationId,
        resourceType,
        resourceId,
        permission
      );

      res.json({
        hasPermission,
      });
    } catch (error) {
      logger.error(`Error checking resource permission: ${error.message}`);
      res.status(500).json({
        message: "Failed to check permission",
        error: "PERMISSION_CHECK_ERROR",
      });
    }
  }
}

module.exports = new PermissionController();
