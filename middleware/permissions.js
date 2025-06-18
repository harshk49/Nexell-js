import mongoose from "mongoose";

import Membership from "../models/Membership.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Middleware to check if a user has a specific role in an organization
 * @param {Array} roles - Array of accepted roles (e.g., ["admin", "member"])
 */
const checkRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;

      // Get the organization ID from request params, query, or body
      let organizationId =
        req.params.organizationId ||
        req.query.organizationId ||
        (req.body && req.body.organizationId);

      // If no organization ID is provided, get the user's current organization
      if (!organizationId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(401).json({
            message: "User not found",
            error: "USER_NOT_FOUND",
          });
        }
        organizationId = user.currentOrganization;
      }

      // If still no organization ID, reject the request
      if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
        return res.status(400).json({
          message: "Organization ID is required",
          error: "ORGANIZATION_ID_REQUIRED",
        });
      }

      // Find the user's membership in the organization
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        status: "active",
      });

      if (!membership) {
        return res.status(403).json({
          message: "You are not a member of this organization",
          error: "NOT_ORGANIZATION_MEMBER",
        });
      }

      // Check if the user has the required role
      if (roles.length > 0 && !roles.includes(membership.role)) {
        return res.status(403).json({
          message: `This action requires ${roles.join(" or ")} role`,
          error: "INSUFFICIENT_ROLE",
        });
      }

      // Add membership info to the request object for later use
      req.membership = membership;
      req.organizationId = organizationId;
      next();
    } catch (error) {
      logger.error(`Role check error: ${error.message}`);
      res.status(500).json({
        message: "Server error during role verification",
        error: "ROLE_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check if a user has specific permissions in an organization
 * @param {Array} permissions - Array of required permissions
 */
const checkPermission = (permissions = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;

      // Get the organization ID from request params, query, or body
      let organizationId =
        req.params.organizationId ||
        req.query.organizationId ||
        (req.body && req.body.organizationId);

      // If no organization ID is provided, get the user's current organization
      if (!organizationId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(401).json({
            message: "User not found",
            error: "USER_NOT_FOUND",
          });
        }
        organizationId = user.currentOrganization;
      }

      // If still no organization ID, reject the request
      if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
        return res.status(400).json({
          message: "Organization ID is required",
          error: "ORGANIZATION_ID_REQUIRED",
        });
      }

      // Find the user's membership in the organization
      const membership = await Membership.findOne({
        user: userId,
        organization: organizationId,
        status: "active",
      });

      if (!membership) {
        return res.status(403).json({
          message: "You are not a member of this organization",
          error: "NOT_ORGANIZATION_MEMBER",
        });
      }

      // Admin role has all permissions
      if (membership.role === "admin") {
        req.membership = membership;
        req.organizationId = organizationId;
        return next();
      }

      // Check if the user has all the required permissions
      const hasAllPermissions = permissions.every(
        (permission) =>
          membership.permissions && membership.permissions[permission] === true
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          message: "You don't have the required permissions for this action",
          error: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Add membership info to the request object for later use
      req.membership = membership;
      req.organizationId = organizationId;
      next();
    } catch (error) {
      logger.error(`Permission check error: ${error.message}`);
      res.status(500).json({
        message: "Server error during permission verification",
        error: "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check if a user belongs to any organizations
 */
const requireOrganization = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Check if user has any organization memberships
    const memberships = await Membership.find({
      user: userId,
      status: "active",
    });

    if (!memberships || memberships.length === 0) {
      return res.status(403).json({
        message: "You must be a member of at least one organization",
        error: "NO_ORGANIZATION_MEMBERSHIP",
      });
    }

    next();
  } catch (error) {
    logger.error(`Organization requirement check error: ${error.message}`);
    res.status(500).json({
      message: "Server error during organization verification",
      error: "ORGANIZATION_CHECK_ERROR",
    });
  }
};

/**
 * Verify resource owner or organization permission
 * Can be used for tasks, notes, or other resources that have an owner field
 * and optionally an organization field
 */
const verifyResourceAccess = (Model, permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const resourceId =
        req.params.id || req.params.taskId || req.params.noteId;

      if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          message: "Valid resource ID is required",
          error: "INVALID_RESOURCE_ID",
        });
      }

      const resource = await Model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          message: "Resource not found",
          error: "RESOURCE_NOT_FOUND",
        });
      }

      // If user is the owner, allow access regardless of organization
      if (resource.owner && resource.owner.toString() === userId) {
        req.resource = resource;
        return next();
      }

      // If resource belongs to an organization, check membership and permissions
      if (resource.organization) {
        const membership = await Membership.findOne({
          user: userId,
          organization: resource.organization,
          status: "active",
        });

        if (!membership) {
          return res.status(403).json({
            message: "You are not a member of this resource's organization",
            error: "NOT_ORGANIZATION_MEMBER",
          });
        }

        // Admin role or having the specific permission grants access
        if (
          membership.role === "admin" ||
          (membership.permissions && membership.permissions[permissionName])
        ) {
          req.resource = resource;
          req.membership = membership;
          return next();
        }

        return res.status(403).json({
          message: "You don't have permission to access this resource",
          error: "RESOURCE_ACCESS_DENIED",
        });
      }

      // If we get here, the resource has no organization and user is not the owner
      return res.status(403).json({
        message: "You don't have permission to access this resource",
        error: "RESOURCE_ACCESS_DENIED",
      });
    } catch (error) {
      logger.error(`Resource access check error: ${error.message}`);
      res.status(500).json({
        message: "Server error during resource access verification",
        error: "RESOURCE_ACCESS_CHECK_ERROR",
      });
    }
  };
};

export {
  checkRole,
  checkPermission,
  requireOrganization,
  verifyResourceAccess,
};
