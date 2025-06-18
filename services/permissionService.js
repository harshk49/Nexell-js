import CustomRole from "../models/CustomRole.js";
import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";
import PermissionTemplate from "../models/PermissionTemplate.js";
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import User from "../models/User.js";

import logger from "../utils/logger.js";

class PermissionService {
  /**
   * Get a custom role by ID
   */
  async getCustomRoleById(roleId, organizationId) {
    try {
      const role = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      return role;
    } catch (error) {
      logger.error(`Error getting custom role: ${error.message}`);
      throw new Error(`Failed to get role: ${error.message}`);
    }
  }

  /**
   * Get all custom roles for an organization
   */
  async getOrganizationRoles(organizationId) {
    try {
      const roles = await CustomRole.find({
        organization: organizationId,
      }).sort({ name: 1 });

      return roles;
    } catch (error) {
      logger.error(`Error getting organization roles: ${error.message}`);
      throw new Error(`Failed to get roles: ${error.message}`);
    }
  }

  /**
   * Create a new custom role
   */
  async createCustomRole(organizationId, roleData, userId) {
    try {
      // Check if role with same name already exists
      const existingRole = await CustomRole.findOne({
        name: roleData.name,
        organization: organizationId,
      });

      if (existingRole) {
        throw new Error("A role with this name already exists");
      }

      const newRole = new CustomRole({
        ...roleData,
        organization: organizationId,
        isSystemRole: false,
        createdBy: userId,
      });

      await newRole.save();
      return newRole;
    } catch (error) {
      logger.error(`Error creating custom role: ${error.message}`);
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Update a custom role
   */
  async updateCustomRole(roleId, organizationId, updates, userId) {
    try {
      const role = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      if (role.isSystemRole) {
        throw new Error("System roles cannot be modified");
      }

      // Apply updates
      Object.keys(updates).forEach((key) => {
        if (key !== "organization" && key !== "isSystemRole") {
          if (key === "permissions" && typeof updates[key] === "object") {
            // Merge permissions rather than replace
            role.permissions = this._mergePermissions(
              role.permissions,
              updates[key]
            );
          } else {
            role[key] = updates[key];
          }
        }
      });

      role.updatedBy = userId;
      await role.save();

      return role;
    } catch (error) {
      logger.error(`Error updating custom role: ${error.message}`);
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Delete a custom role
   */
  async deleteCustomRole(roleId, organizationId, newRoleId) {
    try {
      const role = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      if (role.isSystemRole) {
        throw new Error("System roles cannot be deleted");
      }

      // Check if role is in use
      const memberships = await Membership.find({
        organization: organizationId,
        customRole: roleId,
      });

      if (memberships.length > 0 && !newRoleId) {
        throw new Error(
          `This role is assigned to ${memberships.length} members. Please provide a replacement role.`
        );
      }

      // Reassign memberships if necessary
      if (memberships.length > 0 && newRoleId) {
        const newRole = await CustomRole.findOne({
          _id: newRoleId,
          organization: organizationId,
        });

        if (!newRole) {
          throw new Error("Replacement role not found");
        }

        await Membership.updateMany(
          { organization: organizationId, customRole: roleId },
          { $set: { customRole: newRoleId, role: newRole.basedOn } }
        );
      }

      // Delete the role
      await CustomRole.deleteOne({ _id: roleId });

      return {
        success: true,
        message: `Role deleted${
          memberships.length > 0
            ? ` and ${memberships.length} memberships reassigned`
            : ""
        }`,
      };
    } catch (error) {
      logger.error(`Error deleting custom role: ${error.message}`);
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  /**
   * Create default system roles for a new organization
   */
  async createDefaultRolesForOrganization(organizationId, userId) {
    try {
      await CustomRole.createDefaultRoles(organizationId, userId);
      return {
        success: true,
        message: "Default roles created successfully",
      };
    } catch (error) {
      logger.error(`Error creating default roles: ${error.message}`);
      throw new Error(`Failed to create default roles: ${error.message}`);
    }
  }

  /**
   * Clone a role (either system or custom) to create a new custom role
   */
  async cloneRole(roleId, organizationId, newRoleName, userId) {
    try {
      const sourceRole = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!sourceRole) {
        throw new Error("Source role not found");
      }

      // Check if role with same name already exists
      const existingRole = await CustomRole.findOne({
        name: newRoleName,
        organization: organizationId,
      });

      if (existingRole) {
        throw new Error("A role with this name already exists");
      }

      // Create new role based on source
      const newRole = new CustomRole({
        name: newRoleName,
        description: `Clone of ${sourceRole.name}`,
        organization: organizationId,
        isSystemRole: false,
        basedOn: sourceRole.basedOn,
        permissions: JSON.parse(JSON.stringify(sourceRole.permissions)), // Deep copy
        createdBy: userId,
      });

      await newRole.save();
      return newRole;
    } catch (error) {
      logger.error(`Error cloning role: ${error.message}`);
      throw new Error(`Failed to clone role: ${error.message}`);
    }
  }

  /**
   * Set resource-specific permission overrides for a role
   */
  async setResourcePermissionOverride(
    roleId,
    organizationId,
    resourceType,
    resourceId,
    permissions
  ) {
    try {
      const role = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      // Validate resource exists
      await this._validateResource(resourceType, resourceId, organizationId);

      // Check if override for this resource already exists
      const existingOverrideIndex = role.resourcePermissionOverrides.findIndex(
        (override) =>
          override.resourceType === resourceType &&
          override.resourceId.toString() === resourceId
      );

      if (existingOverrideIndex >= 0) {
        // Update existing override
        role.resourcePermissionOverrides[existingOverrideIndex].permissions =
          permissions;
      } else {
        // Add new override
        role.resourcePermissionOverrides.push({
          resourceType,
          resourceId,
          permissions,
        });
      }

      await role.save();
      return role;
    } catch (error) {
      logger.error(
        `Error setting resource permission override: ${error.message}`
      );
      throw new Error(`Failed to set permission override: ${error.message}`);
    }
  }

  /**
   * Remove a resource-specific permission override
   */
  async removeResourcePermissionOverride(
    roleId,
    organizationId,
    resourceType,
    resourceId
  ) {
    try {
      const role = await CustomRole.findOne({
        _id: roleId,
        organization: organizationId,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      // Filter out the specified override
      role.resourcePermissionOverrides =
        role.resourcePermissionOverrides.filter(
          (override) =>
            !(
              override.resourceType === resourceType &&
              override.resourceId.toString() === resourceId
            )
        );

      await role.save();
      return role;
    } catch (error) {
      logger.error(
        `Error removing resource permission override: ${error.message}`
      );
      throw new Error(`Failed to remove permission override: ${error.message}`);
    }
  }

  /**
   * Get all permission templates for an organization
   */
  async getPermissionTemplates(organizationId) {
    try {
      const templates = await PermissionTemplate.find({
        organization: organizationId,
      }).sort({ name: 1 });

      return templates;
    } catch (error) {
      logger.error(`Error getting permission templates: ${error.message}`);
      throw new Error(`Failed to get permission templates: ${error.message}`);
    }
  }

  /**
   * Get a permission template by ID
   */
  async getPermissionTemplateById(templateId, organizationId) {
    try {
      const template = await PermissionTemplate.findOne({
        _id: templateId,
        organization: organizationId,
      });

      if (!template) {
        throw new Error("Permission template not found");
      }

      return template;
    } catch (error) {
      logger.error(`Error getting permission template: ${error.message}`);
      throw new Error(`Failed to get permission template: ${error.message}`);
    }
  }

  /**
   * Create a new permission template
   */
  async createPermissionTemplate(organizationId, templateData, userId) {
    try {
      // Check if template with same name already exists
      const existingTemplate = await PermissionTemplate.findOne({
        name: templateData.name,
        organization: organizationId,
      });

      if (existingTemplate) {
        throw new Error("A template with this name already exists");
      }

      const newTemplate = new PermissionTemplate({
        ...templateData,
        organization: organizationId,
        createdBy: userId,
      });

      await newTemplate.save();
      return newTemplate;
    } catch (error) {
      logger.error(`Error creating permission template: ${error.message}`);
      throw new Error(`Failed to create permission template: ${error.message}`);
    }
  }

  /**
   * Update a permission template
   */
  async updatePermissionTemplate(templateId, organizationId, updates, userId) {
    try {
      const template = await PermissionTemplate.findOne({
        _id: templateId,
        organization: organizationId,
      });

      if (!template) {
        throw new Error("Permission template not found");
      }

      // Apply updates
      Object.keys(updates).forEach((key) => {
        if (key !== "organization" && key !== "createdBy") {
          if (key === "permissions" && typeof updates[key] === "object") {
            // Merge permissions rather than replace
            template.permissions = this._mergePermissions(
              template.permissions,
              updates[key]
            );
          } else {
            template[key] = updates[key];
          }
        }
      });

      template.updatedBy = userId;
      await template.save();

      return template;
    } catch (error) {
      logger.error(`Error updating permission template: ${error.message}`);
      throw new Error(`Failed to update permission template: ${error.message}`);
    }
  }

  /**
   * Delete a permission template
   */
  async deletePermissionTemplate(templateId, organizationId) {
    try {
      const template = await PermissionTemplate.findOne({
        _id: templateId,
        organization: organizationId,
      });

      if (!template) {
        throw new Error("Permission template not found");
      }

      // Check if it's a default template
      if (template.isDefault) {
        throw new Error("Default templates cannot be deleted");
      }

      // Delete the template
      await PermissionTemplate.deleteOne({ _id: templateId });

      return {
        success: true,
        message: "Permission template deleted successfully",
      };
    } catch (error) {
      logger.error(`Error deleting permission template: ${error.message}`);
      throw new Error(`Failed to delete permission template: ${error.message}`);
    }
  }

  /**
   * Apply a permission template to a resource (project, team, etc.)
   */
  async applyPermissionTemplate(
    organizationId,
    templateId,
    resourceType,
    resourceId,
    userId
  ) {
    try {
      const template = await PermissionTemplate.findOne({
        _id: templateId,
        organization: organizationId,
      });

      if (!template) {
        throw new Error("Permission template not found");
      }

      // Check if template is applicable to this resource type
      if (
        !template.applicableResourceTypes.includes(resourceType) &&
        template.applicableResourceTypes.length > 0
      ) {
        throw new Error(
          `This template is not applicable to ${resourceType} resources`
        );
      }

      // Validate resource exists
      await this._validateResource(resourceType, resourceId, organizationId);

      // Get all custom roles in the organization
      const roles = await CustomRole.find({ organization: organizationId });

      // Apply template permissions to each role as resource overrides
      for (const role of roles) {
        // Determine the effective permissions for this role based on the template
        const effectivePermissions = this._calculateEffectivePermissions(
          role.permissions,
          template.permissions,
          role.basedOn
        );

        // Add or update resource permission override
        const existingOverrideIndex =
          role.resourcePermissionOverrides.findIndex(
            (override) =>
              override.resourceType === resourceType &&
              override.resourceId.toString() === resourceId
          );

        if (existingOverrideIndex >= 0) {
          // Update existing override
          role.resourcePermissionOverrides[existingOverrideIndex].permissions =
            effectivePermissions;
        } else {
          // Add new override
          role.resourcePermissionOverrides.push({
            resourceType,
            resourceId,
            permissions: effectivePermissions,
          });
        }

        await role.save();
      }

      return {
        success: true,
        message: `Template "${template.name}" applied to ${resourceType} successfully`,
      };
    } catch (error) {
      logger.error(`Error applying permission template: ${error.message}`);
      throw new Error(`Failed to apply permission template: ${error.message}`);
    }
  }

  /**
   * Create default templates for a new organization
   */
  async createDefaultTemplatesForOrganization(organizationId, userId) {
    try {
      await PermissionTemplate.createDefaultTemplates(organizationId, userId);
      return {
        success: true,
        message: "Default permission templates created successfully",
      };
    } catch (error) {
      logger.error(`Error creating default templates: ${error.message}`);
      throw new Error(`Failed to create default templates: ${error.message}`);
    }
  }

  /**
   * Check if user has a specific permission for a resource
   * This performs granular permission checking beyond role-based middleware
   */
  async checkResourcePermission(
    userId,
    organizationId,
    resourceType,
    resourceId,
    permission
  ) {
    try {
      // Get user's membership
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        status: "active",
      }).populate("customRole");

      if (!membership) {
        return false;
      }

      // If admin role, always grant permission
      if (membership.role === "admin") {
        return true;
      }

      // Get custom role if assigned
      const customRole = membership.customRole;

      if (!customRole) {
        // Fall back to base role permissions
        const basePermissions = this._getDefaultPermissionsForRole(
          membership.role
        );
        return this._checkPermissionInObject(basePermissions, permission);
      }

      // Check if there's a resource-specific override
      const override = customRole.resourcePermissionOverrides.find(
        (o) =>
          o.resourceType === resourceType &&
          o.resourceId.toString() === resourceId.toString()
      );

      if (override) {
        // Check permission in the override
        return this._checkPermissionInObject(override.permissions, permission);
      }

      // Fall back to role's general permissions
      return this._checkPermissionInObject(customRole.permissions, permission);
    } catch (error) {
      logger.error(`Error checking resource permission: ${error.message}`);
      throw new Error(`Failed to check permission: ${error.message}`);
    }
  }

  /**
   * Calculate effective permissions when applying a template
   * Takes base permissions and modifies them based on role type
   */
  _calculateEffectivePermissions(
    rolePermissions,
    templatePermissions,
    roleType
  ) {
    const result = JSON.parse(JSON.stringify(rolePermissions)); // Deep copy

    // For admin roles, keep all their existing permissions, no restrictions
    if (roleType === "admin") {
      return result;
    }

    // For other roles, apply template with some intelligence
    // The goal is to restrict permissions, not expand them
    Object.keys(templatePermissions).forEach((category) => {
      if (typeof templatePermissions[category] === "object") {
        result[category] = result[category] || {};

        Object.keys(templatePermissions[category]).forEach((action) => {
          // Only apply restriction (if template says false, enforce it)
          if (templatePermissions[category][action] === false) {
            result[category][action] = false;
          }
        });
      }
    });

    return result;
  }

  /**
   * Check if a specific permission exists and is true in a permission object
   * @param {Object} permissionObject - The permissions object to check
   * @param {String} permission - The permission to check (format: "category.action")
   */
  _checkPermissionInObject(permissionObject, permission) {
    const [category, action] = permission.split(".");

    if (
      !permissionObject ||
      !permissionObject[category] ||
      typeof permissionObject[category][action] === "undefined"
    ) {
      return false;
    }

    return permissionObject[category][action] === true;
  }

  // Private helper methods
  _mergePermissions(originalPermissions, updatedPermissions) {
    const merged = { ...originalPermissions };

    // For each category in updatedPermissions
    for (const category in updatedPermissions) {
      if (
        typeof updatedPermissions[category] === "object" &&
        !Array.isArray(updatedPermissions[category])
      ) {
        // If the category exists in the original and is an object, merge the objects
        if (merged[category] && typeof merged[category] === "object") {
          merged[category] = {
            ...merged[category],
            ...updatedPermissions[category],
          };
        } else {
          // Otherwise, just set the value
          merged[category] = updatedPermissions[category];
        }
      } else {
        // For non-object values, just set them
        merged[category] = updatedPermissions[category];
      }
    }

    return merged;
  }

  async _validateResource(resourceType, resourceId, organizationId) {
    let resource;

    switch (resourceType) {
      case "project":
        resource = await Project.findOne({
          _id: resourceId,
          organization: organizationId,
        });
        break;
      case "team":
        resource = await Team.findOne({
          _id: resourceId,
          organization: organizationId,
        });
        break;
      case "task":
        // For tasks, we check if the task's project belongs to the organization
        resource = await Task.findById(resourceId).populate(
          "project",
          "organization"
        );
        if (
          resource &&
          (!resource.project ||
            resource.project.organization.toString() !== organizationId)
        ) {
          resource = null;
        }
        break;
      default:
        throw new Error(`Invalid resource type: ${resourceType}`);
    }

    if (!resource) {
      throw new Error(
        `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found or not part of the organization`
      );
    }
  }

  async _checkResourceOwnership(userId, resourceType, resourceId) {
    try {
      let isOwner = false;

      switch (resourceType) {
        case "project":
          isOwner = await Project.exists({ _id: resourceId, owner: userId });
          break;
        case "team":
          isOwner = await Team.exists({ _id: resourceId, leader: userId });
          break;
        case "task":
          isOwner = await Task.exists({ _id: resourceId, owner: userId });
          break;
      }

      return isOwner;
    } catch (error) {
      logger.error(`Error checking resource ownership: ${error.message}`);
      return false;
    }
  }
}

export default new PermissionService();
