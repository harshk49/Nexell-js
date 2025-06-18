import express from "express";

import reportController from "../controllers/reportController.js";
import { authenticateUser as auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/permissions.js";

const router = express.Router();

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

export default router;
