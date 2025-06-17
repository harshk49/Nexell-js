const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/auth");
const { checkRole } = require("../middleware/permissions");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Most routes require admin or manager role
const adminManagerMiddleware = checkRole(["admin", "manager"]);

/**
 * @route   GET /api/permissions/roles
 * @desc    Get all custom roles for an organization
 * @access  Private (admin, manager)
 */
router.get("/roles", adminManagerMiddleware, async (req, res) => {
  await permissionController.getCustomRoles(req, res);
});

/**
 * @route   GET /api/permissions/roles/:roleId
 * @desc    Get a custom role by ID
 * @access  Private (admin, manager)
 */
router.get(
  "/roles/:roleId",
  [param("roleId").isMongoId(), adminManagerMiddleware],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.getCustomRoleById(req, res);
  }
);

/**
 * @route   POST /api/permissions/roles
 * @desc    Create a new custom role
 * @access  Private (admin)
 */
router.post(
  "/roles",
  [
    body("name").notEmpty().isString().trim(),
    body("description").optional().isString().trim(),
    body("basedOn").isIn(["admin", "manager", "member", "guest", "custom"]),
    body("permissions").optional().isObject(),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.createCustomRole(req, res);
  }
);

/**
 * @route   PUT /api/permissions/roles/:roleId
 * @desc    Update a custom role
 * @access  Private (admin)
 */
router.put(
  "/roles/:roleId",
  [
    param("roleId").isMongoId(),
    body("name").optional().isString().trim(),
    body("description").optional().isString().trim(),
    body("permissions").optional().isObject(),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.updateCustomRole(req, res);
  }
);

/**
 * @route   DELETE /api/permissions/roles/:roleId
 * @desc    Delete a custom role
 * @access  Private (admin)
 */
router.delete(
  "/roles/:roleId",
  [
    param("roleId").isMongoId(),
    body("newRoleId").optional().isMongoId(),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.deleteCustomRole(req, res);
  }
);

/**
 * @route   POST /api/permissions/roles/:roleId/resource-override
 * @desc    Set resource-specific permission override for a role
 * @access  Private (admin)
 */
router.post(
  "/roles/:roleId/resource-override",
  [
    param("roleId").isMongoId(),
    body("resourceType").isIn(["project", "team", "task", "note"]),
    body("resourceId").isMongoId(),
    body("permissions").isObject(),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.setResourcePermissionOverride(req, res);
  }
);

/**
 * @route   GET /api/permissions/templates
 * @desc    Get all permission templates for an organization
 * @access  Private (admin, manager)
 */
router.get("/templates", adminManagerMiddleware, async (req, res) => {
  await permissionController.getPermissionTemplates(req, res);
});

/**
 * @route   GET /api/permissions/templates/:templateId
 * @desc    Get a permission template by ID
 * @access  Private (admin, manager)
 */
router.get(
  "/templates/:templateId",
  [param("templateId").isMongoId(), adminManagerMiddleware],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.getPermissionTemplateById(req, res);
  }
);

/**
 * @route   POST /api/permissions/templates
 * @desc    Create a new permission template
 * @access  Private (admin)
 */
router.post(
  "/templates",
  [
    body("name").notEmpty().isString().trim(),
    body("description").optional().isString().trim(),
    body("isDefault").optional().isBoolean(),
    body("permissions").isObject(),
    body("applicableResourceTypes").isArray(),
    body("applicableResourceTypes.*").isIn(["project", "team", "task", "note"]),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.createPermissionTemplate(req, res);
  }
);

/**
 * @route   PUT /api/permissions/templates/:templateId
 * @desc    Update a permission template
 * @access  Private (admin)
 */
router.put(
  "/templates/:templateId",
  [
    param("templateId").isMongoId(),
    body("name").optional().isString().trim(),
    body("description").optional().isString().trim(),
    body("isDefault").optional().isBoolean(),
    body("permissions").optional().isObject(),
    body("applicableResourceTypes").optional().isArray(),
    body("applicableResourceTypes.*").isIn(["project", "team", "task", "note"]),
    checkRole(["admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.updatePermissionTemplate(req, res);
  }
);

/**
 * @route   DELETE /api/permissions/templates/:templateId
 * @desc    Delete a permission template
 * @access  Private (admin)
 */
router.delete(
  "/templates/:templateId",
  [param("templateId").isMongoId(), checkRole(["admin"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.deletePermissionTemplate(req, res);
  }
);

/**
 * @route   POST /api/permissions/templates/:templateId/apply
 * @desc    Apply a permission template to a resource
 * @access  Private (admin, manager)
 */
router.post(
  "/templates/:templateId/apply",
  [
    param("templateId").isMongoId(),
    body("resourceType").isIn(["project", "team", "task", "note"]),
    body("resourceId").isMongoId(),
    adminManagerMiddleware,
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.applyPermissionTemplate(req, res);
  }
);

/**
 * @route   GET /api/permissions/check
 * @desc    Check if user has permission for a resource
 * @access  Private
 */
router.get(
  "/check",
  [
    query("resourceType").isIn(["project", "team", "task", "note"]),
    query("resourceId").isMongoId(),
    query("permission").notEmpty().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await permissionController.checkResourcePermission(req, res);
  }
);

module.exports = router;
