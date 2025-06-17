const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { auth } = require("../middleware/auth");
const { checkRole } = require("../middleware/permissions");

// Time tracking reports
router.get("/time-tracking", auth, reportController.getTimeTrackingReport);

// Task completion reports
router.get("/task-completion", auth, reportController.getTaskCompletionReport);

// Organization productivity report (requires admin or member role)
router.get(
  "/organizations/:organizationId/productivity",
  auth,
  checkRole(["admin", "member"]),
  reportController.getOrganizationProductivityReport
);

// Export reports to CSV
router.get("/export/:reportType", auth, reportController.exportReportToCsv);

module.exports = router;
