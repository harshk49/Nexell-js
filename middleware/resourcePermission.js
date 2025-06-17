const permissionService = require("../services/permissionService");
const logger = require("../utils/logger");

/**
 * Middleware for granular permission checking on resources
 * This extends the basic role-based permission system with more specific checks
 * @param {String} requiredPermission - Permission string in format "category.action" (e.g. "projects.edit")
 * @param {String} resourceTypeParam - Request parameter containing the resource type (optional if fixed)
 * @param {String} resourceIdParam - Request parameter containing the resource ID
 * @param {String} fixedResourceType - Fixed resource type if not from parameter (optional)
 */
const checkResourcePermission = (
  requiredPermission,
  resourceIdParam,
  resourceTypeParam = null,
  fixedResourceType = null
) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      let organizationId = req.organizationId;

      // If organizationId not set by previous middleware
      if (!organizationId) {
        organizationId =
          req.params.organizationId ||
          req.query.organizationId ||
          (req.body && req.body.organizationId);

        if (!organizationId) {
          return res.status(400).json({
            message: "Organization ID is required",
            error: "ORGANIZATION_ID_REQUIRED",
          });
        }
      }

      // Get resource type and ID
      const resourceType =
        fixedResourceType ||
        (resourceTypeParam
          ? req.params[resourceTypeParam] || req.body[resourceTypeParam]
          : null);

      const resourceId =
        req.params[resourceIdParam] ||
        req.query[resourceIdParam] ||
        (req.body && req.body[resourceIdParam]);

      if (!resourceType || !resourceId) {
        return res.status(400).json({
          message: "Resource type and ID are required",
          error: "RESOURCE_PARAMS_REQUIRED",
        });
      }

      // Check permission
      const hasPermission = await permissionService.checkResourcePermission(
        userId,
        organizationId,
        resourceType,
        resourceId,
        requiredPermission
      );

      if (!hasPermission) {
        return res.status(403).json({
          message: `You don't have permission to perform this action`,
          error: "INSUFFICIENT_PERMISSIONS",
          requiredPermission,
          resourceType,
        });
      }

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

module.exports = {
  checkResourcePermission,
};
