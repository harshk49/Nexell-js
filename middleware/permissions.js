import mongoose from "mongoose";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Helper: Get valid organization ID from request or user's current organization
 */
const getOrganizationId = async (req, userId) => {
  let organizationId =
    req.params.organizationId ||
    req.query.organizationId ||
    req.body?.organizationId;

  if (!organizationId) {
    const user = await User.findById(userId);
    if (!user)
      throw { status: 401, message: "User not found", code: "USER_NOT_FOUND" };
    organizationId = user.currentOrganization;
  }

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw {
      status: 400,
      message: "Organization ID is required",
      code: "ORGANIZATION_ID_REQUIRED",
    };
  }

  return organizationId;
};

/**
 * Middleware to check if a user has a specific role in an organization
 */
const checkRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const organizationId = await getOrganizationId(req, userId);

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

      if (roles.length > 0 && !roles.includes(membership.role)) {
        return res.status(403).json({
          message: `This action requires ${roles.join(" or ")} role`,
          error: "INSUFFICIENT_ROLE",
        });
      }

      req.membership = membership;
      req.organizationId = organizationId;
      next();
    } catch (err) {
      logger.error(`Role check error: ${err.message || err}`);
      res.status(err.status || 500).json({
        message: err.message || "Server error during role verification",
        error: err.code || "ROLE_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check if a user has specific permissions in an organization
 */
const checkPermission = (permissions = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const organizationId = await getOrganizationId(req, userId);

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

      if (
        membership.role === "admin" ||
        permissions.every((p) => membership.permissions?.[p])
      ) {
        req.membership = membership;
        req.organizationId = organizationId;
        return next();
      }

      return res.status(403).json({
        message: "You don't have the required permissions for this action",
        error: "INSUFFICIENT_PERMISSIONS",
      });
    } catch (err) {
      logger.error(`Permission check error: ${err.message || err}`);
      res.status(err.status || 500).json({
        message: err.message || "Server error during permission verification",
        error: err.code || "PERMISSION_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to ensure the user is a member of at least one organization
 */
const requireOrganization = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const memberships = await Membership.find({
      user: userId,
      status: "active",
    });

    if (!memberships.length) {
      return res.status(403).json({
        message: "You must be a member of at least one organization",
        error: "NO_ORGANIZATION_MEMBERSHIP",
      });
    }

    next();
  } catch (err) {
    logger.error(`Organization requirement check error: ${err.message}`);
    res.status(500).json({
      message: "Server error during organization verification",
      error: "ORGANIZATION_CHECK_ERROR",
    });
  }
};

/**
 * Middleware to verify if the user can access a resource
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

      if (resource.owner?.toString() === userId) {
        req.resource = resource;
        return next();
      }

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

        if (
          membership.role === "admin" ||
          membership.permissions?.[permissionName]
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

      return res.status(403).json({
        message: "You don't have permission to access this resource",
        error: "RESOURCE_ACCESS_DENIED",
      });
    } catch (err) {
      logger.error(`Resource access check error: ${err.message}`);
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
