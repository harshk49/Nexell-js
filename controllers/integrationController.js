import integrationService from "../services/integrationService.js";
import logger from "../utils/logger.js";

class IntegrationController {
  /**
   * Generate iCal format calendar data for a user
   */
  async getCalendarData(req, res) {
    try {
      const userId = req.user.userId;
      const filters = req.query;

      const calendarData = await integrationService.generateCalendarData(
        userId,
        filters
      );

      res.set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=calendar-${userId}.ics`,
      });
      res.send(calendarData.icalContent);
    } catch (error) {
      logger.error(`Calendar data generation error: ${error.message}`);
      res.status(500).json({
        message: "Failed to generate calendar data",
        error: "CALENDAR_GENERATION_ERROR",
      });
    }
  }

  /**
   * Get calendar data as JSON instead of iCal format
   */
  async getCalendarEvents(req, res) {
    try {
      const userId = req.user.userId;
      const filters = req.query;

      const calendarData = await integrationService.generateCalendarData(
        userId,
        filters
      );

      res.json({
        events: calendarData.events,
      });
    } catch (error) {
      logger.error(`Calendar events retrieval error: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve calendar events",
        error: "CALENDAR_RETRIEVAL_ERROR",
      });
    }
  }

  /**
   * Generate invoice data
   */
  async getInvoiceData(req, res) {
    try {
      const userId = req.user.userId;
      const filters = req.query;

      const invoiceData = await integrationService.generateInvoiceData(
        userId,
        filters
      );

      res.json(invoiceData);
    } catch (error) {
      logger.error(`Invoice data generation error: ${error.message}`);
      res.status(500).json({
        message: "Failed to generate invoice data",
        error: "INVOICE_GENERATION_ERROR",
      });
    }
  }

  /**
   * Export invoice data as CSV
   */
  async exportInvoice(req, res) {
    try {
      const userId = req.user.userId;
      const { format = "csv" } = req.query;
      const filters = req.body;

      const invoiceData = await integrationService.generateInvoiceData(
        userId,
        filters
      );
      const exportedData = await integrationService.exportReport(
        invoiceData,
        format,
        userId
      );

      res.set({
        "Content-Type": exportedData.contentType,
        "Content-Disposition": `attachment; filename=${exportedData.filename}`,
      });
      res.send(exportedData.data);
    } catch (error) {
      logger.error(`Invoice export error: ${error.message}`);
      res.status(500).json({
        message: "Failed to export invoice",
        error: "INVOICE_EXPORT_ERROR",
      });
    }
  }

  /**
   * Get Pomodoro timer statistics
   */
  async getPomodoroStats(req, res) {
    try {
      const userId = req.user.userId;
      const { timeRange = "week" } = req.query;

      const stats = await integrationService.generatePomodoroStats(
        userId,
        timeRange
      );

      res.json(stats);
    } catch (error) {
      logger.error(`Pomodoro stats error: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve Pomodoro statistics",
        error: "POMODORO_STATS_ERROR",
      });
    }
  }

  /**
   * Get Pomodoro timer settings
   */
  async getPomodoroSettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = await integrationService.getPomodoroSettings(userId);

      res.json(settings);
    } catch (error) {
      logger.error(`Error getting Pomodoro settings: ${error.message}`);
      res.status(500).json({
        message: "Failed to retrieve Pomodoro settings",
        error: "POMODORO_SETTINGS_ERROR",
      });
    }
  }

  /**
   * Update Pomodoro timer settings
   */
  async updatePomodoroSettings(req, res) {
    try {
      const userId = req.user.userId;
      const settings = req.body;

      const updatedSettings =
        await integrationService.configurePomodoroSettings(userId, settings);

      res.json({
        message: "Pomodoro settings updated successfully",
        settings: updatedSettings,
      });
    } catch (error) {
      logger.error(`Error updating Pomodoro settings: ${error.message}`);
      res.status(500).json({
        message: "Failed to update Pomodoro settings",
        error: "POMODORO_SETTINGS_UPDATE_ERROR",
      });
    }
  }
}

export default new IntegrationController();
