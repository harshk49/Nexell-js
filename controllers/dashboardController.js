const dashboardService = require("../services/dashboardService");
const logger = require("../utils/logger");

class DashboardController {
  /**
   * Create a new dashboard
   */
  async createDashboard(req, res) {
    try {
      const dashboard = await dashboardService.createDashboard(
        req.user.userId,
        req.body
      );

      res.status(201).json({
        message: "Dashboard created successfully",
        dashboard,
      });
    } catch (error) {
      logger.error(`Dashboard creation error: ${error.message}`);
      res.status(500).json({
        message: "Error creating dashboard",
        error: "DASHBOARD_CREATION_ERROR",
      });
    }
  }

  /**
   * Get user's dashboards
   */
  async getUserDashboards(req, res) {
    try {
      const dashboards = await dashboardService.getUserDashboards(
        req.user.userId
      );

      res.json({
        message: "Dashboards retrieved successfully",
        dashboards,
      });
    } catch (error) {
      logger.error(`Get dashboards error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching dashboards",
        error: "DASHBOARD_FETCH_ERROR",
      });
    }
  }

  /**
   * Get shared dashboards
   */
  async getSharedDashboards(req, res) {
    try {
      const dashboards = await dashboardService.getSharedDashboards(
        req.user.userId
      );

      res.json({
        message: "Shared dashboards retrieved successfully",
        dashboards,
      });
    } catch (error) {
      logger.error(`Get shared dashboards error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching shared dashboards",
        error: "SHARED_DASHBOARD_FETCH_ERROR",
      });
    }
  }

  /**
   * Get organization dashboards
   */
  async getOrganizationDashboards(req, res) {
    try {
      const dashboards = await dashboardService.getOrganizationDashboards(
        req.params.organizationId,
        req.user.userId
      );

      res.json({
        message: "Organization dashboards retrieved successfully",
        dashboards,
      });
    } catch (error) {
      logger.error(`Get organization dashboards error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching organization dashboards",
        error: "ORGANIZATION_DASHBOARD_FETCH_ERROR",
      });
    }
  }

  /**
   * Get a specific dashboard
   */
  async getDashboardById(req, res) {
    try {
      const dashboard = await dashboardService.getDashboardById(
        req.params.dashboardId,
        req.user.userId
      );

      res.json({
        message: "Dashboard retrieved successfully",
        dashboard,
      });
    } catch (error) {
      logger.error(`Get dashboard error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("access")
          ? 403
          : 500;

      const errorCode = error.message.includes("not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("access")
          ? "DASHBOARD_ACCESS_DENIED"
          : "DASHBOARD_FETCH_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Update a dashboard
   */
  async updateDashboard(req, res) {
    try {
      const dashboard = await dashboardService.updateDashboard(
        req.params.dashboardId,
        req.user.userId,
        req.body
      );

      res.json({
        message: "Dashboard updated successfully",
        dashboard,
      });
    } catch (error) {
      logger.error(`Update dashboard error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("owner")
          ? 403
          : 500;

      const errorCode = error.message.includes("not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("owner")
          ? "DASHBOARD_UPDATE_DENIED"
          : "DASHBOARD_UPDATE_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(req, res) {
    try {
      await dashboardService.deleteDashboard(
        req.params.dashboardId,
        req.user.userId
      );

      res.json({
        message: "Dashboard deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete dashboard error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("owner")
          ? 403
          : 500;

      const errorCode = error.message.includes("not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("owner")
          ? "DASHBOARD_DELETE_DENIED"
          : "DASHBOARD_DELETE_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Add a widget to a dashboard
   */
  async addWidget(req, res) {
    try {
      const widget = await dashboardService.addWidget(
        req.params.dashboardId,
        req.user.userId,
        req.body
      );

      res.status(201).json({
        message: "Widget added successfully",
        widget,
      });
    } catch (error) {
      logger.error(`Add widget error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("owner")
          ? 403
          : 500;

      const errorCode = error.message.includes("not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("owner")
          ? "WIDGET_ADD_DENIED"
          : "WIDGET_ADD_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Update a widget
   */
  async updateWidget(req, res) {
    try {
      const widget = await dashboardService.updateWidget(
        req.params.dashboardId,
        req.params.widgetId,
        req.user.userId,
        req.body
      );

      res.json({
        message: "Widget updated successfully",
        widget,
      });
    } catch (error) {
      logger.error(`Update widget error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("owner")
          ? 403
          : 500;

      const errorCode = error.message.includes("Dashboard not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("Widget not found")
          ? "WIDGET_NOT_FOUND"
          : error.message.includes("owner")
            ? "WIDGET_UPDATE_DENIED"
            : "WIDGET_UPDATE_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Delete a widget
   */
  async deleteWidget(req, res) {
    try {
      await dashboardService.deleteWidget(
        req.params.dashboardId,
        req.params.widgetId,
        req.user.userId
      );

      res.json({
        message: "Widget deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete widget error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("owner")
          ? 403
          : 500;

      const errorCode = error.message.includes("Dashboard not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("Widget not found")
          ? "WIDGET_NOT_FOUND"
          : error.message.includes("owner")
            ? "WIDGET_DELETE_DENIED"
            : "WIDGET_DELETE_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }

  /**
   * Get widget data
   */
  async getWidgetData(req, res) {
    try {
      const data = await dashboardService.getWidgetData(
        req.params.dashboardId,
        req.params.widgetId,
        req.user.userId
      );

      res.json({
        message: "Widget data retrieved successfully",
        ...data,
      });
    } catch (error) {
      logger.error(`Get widget data error: ${error.message}`);

      const errorStatus = error.message.includes("not found")
        ? 404
        : error.message.includes("access")
          ? 403
          : 500;

      const errorCode = error.message.includes("Dashboard not found")
        ? "DASHBOARD_NOT_FOUND"
        : error.message.includes("Widget not found")
          ? "WIDGET_NOT_FOUND"
          : error.message.includes("access")
            ? "WIDGET_ACCESS_DENIED"
            : "WIDGET_DATA_FETCH_ERROR";

      res.status(errorStatus).json({
        message: error.message,
        error: errorCode,
      });
    }
  }
}

module.exports = new DashboardController();
