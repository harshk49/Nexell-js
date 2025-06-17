const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { auth } = require("../middleware/auth");
const { checkRole } = require("../middleware/permissions");

// Dashboard management routes
router.post("/", auth, dashboardController.createDashboard);
router.get("/user", auth, dashboardController.getUserDashboards);
router.get("/shared", auth, dashboardController.getSharedDashboards);
router.get(
  "/organizations/:organizationId",
  auth,
  dashboardController.getOrganizationDashboards
);
router.get("/:dashboardId", auth, dashboardController.getDashboardById);
router.put("/:dashboardId", auth, dashboardController.updateDashboard);
router.delete("/:dashboardId", auth, dashboardController.deleteDashboard);

// Widget management routes
router.post("/:dashboardId/widgets", auth, dashboardController.addWidget);
router.put(
  "/:dashboardId/widgets/:widgetId",
  auth,
  dashboardController.updateWidget
);
router.delete(
  "/:dashboardId/widgets/:widgetId",
  auth,
  dashboardController.deleteWidget
);
router.get(
  "/:dashboardId/widgets/:widgetId/data",
  auth,
  dashboardController.getWidgetData
);

module.exports = router;
