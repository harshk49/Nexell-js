import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../utils/apiResponse.js";

/**
 * Middleware to check if a user has permission for a specific resource
 * @param {Object} options - Options for permission check
 * @param {string} options.resource - Resource model name (e.g., 'Note', 'Task')
 * @param {string} options.idParam - Request parameter that contains the resource ID (default: 'id')
 * @param {string} options.ownerField - Field in the resource that contains the owner ID (default: 'owner')
 * @param {Function} options.customCheck - Optional custom function for special permission logic
 * @returns {Function} Express middleware
 */
export const checkResourcePermission = (options) => {
  const {
    resource,
    idParam = "id",
    ownerField = "owner",
    customCheck,
  } = options;

  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const userId = req.user.userId;

      // Validate the resource ID
      if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: "Invalid resource ID",
          error: "INVALID_ID",
          requestId: req.requestId,
        });
      }

      // Get the model
      const Model = mongoose.model(resource);

      // Find the resource
      const resourceDoc = await Model.findById(resourceId);
      if (!resourceDoc) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: `${resource} not found`,
          error: "RESOURCE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      // Check ownership
      const isOwner =
        resourceDoc[ownerField] &&
        resourceDoc[ownerField].toString() === userId;

      // Check shared/collaborative permissions if not owner
      let hasPermission = isOwner;

      // If not owner, check for shared or collaborative permissions
      if (!hasPermission && resourceDoc.sharedWith) {
        hasPermission =
          Array.isArray(resourceDoc.sharedWith) &&
          resourceDoc.sharedWith.some((id) => id.toString() === userId);
      }

      // Check collaborators if not already permitted and collaborators field exists
      if (!hasPermission && resourceDoc.collaborators) {
        hasPermission =
          Array.isArray(resourceDoc.collaborators) &&
          resourceDoc.collaborators.some((c) => c.user.toString() === userId);
      }

      // For public resources
      if (!hasPermission && resourceDoc.isShared === true) {
        hasPermission = true;
      }

      // If custom check function provided, use it for special permission logic
      if (customCheck && typeof customCheck === "function") {
        const customPermission = await customCheck(resourceDoc, req);
        hasPermission = hasPermission || customPermission;
      }

      if (!hasPermission) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: `You don't have permission to access this ${resource.toLowerCase()}`,
          error: "PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      // If we reach here, user has permission - attach resource to req for later use
      req.resource = resourceDoc;
      next();
    } catch (error) {
      logger.error(`Permission check error: ${error.message}`, {
        error,
        userId: req.user?.userId,
        resource,
        requestId: req.requestId,
      });

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error checking permissions",
        error: "PERMISSION_CHECK_ERROR",
        requestId: req.requestId,
      });
    }
  };
};
