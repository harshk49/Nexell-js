import reportService from "../services/reportService.js";
import logger from "../utils/logger.js";

class ReportController {
  /**
   * Get time tracking report data
   */
  async getTimeTrackingReport(req, res) {
    try {
      const report = await reportService.getTimeTrackingReport({
        userId: req.query.userId,
        organizationId: req.organizationId || req.query.organizationId,
        taskId: req.query.taskId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        groupBy: req.query.groupBy || "day",
        category: req.query.category,
        tags: req.query.tags ? req.query.tags.split(",") : undefined,
      });

      res.json({
        message: "Time tracking report generated successfully",
        report,
      });
    } catch (error) {
      logger.error(`Time tracking report error: ${error.message}`);
      res.status(500).json({
        message: "Error generating time tracking report",
        error: "REPORT_GENERATION_ERROR",
      });
    }
  }

  /**
   * Get task completion report
   */
  async getTaskCompletionReport(req, res) {
    try {
      const report = await reportService.getTaskCompletionReport({
        organizationId: req.organizationId || req.query.organizationId,
        userId: req.query.userId,
        period: req.query.period || "daily",
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        groupBy: req.query.groupBy || "date",
      });

      res.json({
        message: "Task completion report generated successfully",
        report,
      });
    } catch (error) {
      logger.error(`Task completion report error: ${error.message}`);
      res.status(500).json({
        message: "Error generating task completion report",
        error: "REPORT_GENERATION_ERROR",
      });
    }
  }

  /**
   * Get organization productivity report
   */
  async getOrganizationProductivityReport(req, res) {
    try {
      const report = await reportService.getOrganizationProductivityReport(
        req.params.organizationId || req.organizationId,
        req.query.startDate,
        req.query.endDate
      );

      res.json({
        message: "Organization productivity report generated successfully",
        report,
      });
    } catch (error) {
      logger.error(`Organization productivity report error: ${error.message}`);

      let errorStatus = 500;
      let errorCode = "REPORT_GENERATION_ERROR";

      if (error.message.includes("not found")) {
        errorStatus = 404;
        errorCode = "ORGANIZATION_NOT_FOUND";
      }

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Export report data to CSV
   */
  async exportReportToCsv(req, res) {
    try {
      let reportData;

      // Get the report data based on report type
      switch (req.params.reportType) {
        case "time":
          reportData = await reportService.getTimeTrackingReport({
            userId: req.query.userId,
            organizationId: req.organizationId || req.query.organizationId,
            taskId: req.query.taskId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            groupBy: req.query.groupBy || "day",
            category: req.query.category,
            tags: req.query.tags ? req.query.tags.split(",") : undefined,
          });
          break;

        case "tasks":
          reportData = await reportService.getTaskCompletionReport({
            organizationId: req.organizationId || req.query.organizationId,
            userId: req.query.userId,
            period: req.query.period || "daily",
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            groupBy: req.query.groupBy || "date",
          });
          break;

        case "productivity": {
          const productivityReport =
            await reportService.getOrganizationProductivityReport(
              req.params.organizationId || req.organizationId,
              req.query.startDate,
              req.query.endDate
            );
          reportData = productivityReport.memberStats;
          break;
        }

        default:
          return res.status(400).json({
            message: `Unsupported report type: ${req.params.reportType}`,
            error: "INVALID_REPORT_TYPE",
          });
      }

      // Convert to CSV
      const csvData = await reportService.exportToCsv(
        reportData,
        req.params.reportType
      );

      // Generate filename
      const date = new Date().toISOString().split("T")[0];
      const filename = `${req.params.reportType}-report-${date}.csv`;

      // Set response headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Send CSV data
      res.send(csvData);
    } catch (error) {
      logger.error(`Report export error: ${error.message}`);
      res.status(500).json({
        message: "Error exporting report to CSV",
        error: "REPORT_EXPORT_ERROR",
      });
    }
  }
}

export default new ReportController();
