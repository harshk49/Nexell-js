const Dashboard = require("../models/Dashboard");
const reportService = require("./reportService");
const logger = require("../utils/logger");

class DashboardService {
  /**
   * Create a new dashboard
   */
  async createDashboard(userId, data) {
    try {
      const {
        name,
        description,
        organization,
        isDefault,
        isShared,
        sharedWith,
        widgets,
        refreshInterval,
      } = data;

      // If creating a default dashboard, unset any existing defaults for this user
      if (isDefault) {
        await Dashboard.updateMany(
          { owner: userId, isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      // Create the dashboard
      const dashboard = new Dashboard({
        name,
        description,
        owner: userId,
        organization,
        isDefault: isDefault || false,
        isShared: isShared || false,
        sharedWith: sharedWith || [],
        widgets: widgets || [],
        refreshInterval: refreshInterval || 0,
      });

      await dashboard.save();
      return dashboard;
    } catch (error) {
      logger.error(`Error creating dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user dashboards
   */
  async getUserDashboards(userId) {
    try {
      return await Dashboard.find({ owner: userId }).sort({
        isDefault: -1,
        createdAt: -1,
      });
    } catch (error) {
      logger.error(`Error fetching user dashboards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shared dashboards for user
   */
  async getSharedDashboards(userId) {
    try {
      return await Dashboard.find({
        isShared: true,
        sharedWith: userId,
      }).populate("owner", "username firstName lastName");
    } catch (error) {
      logger.error(`Error fetching shared dashboards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get organization dashboards
   */
  async getOrganizationDashboards(organizationId, userId) {
    try {
      return await Dashboard.find({
        organization: organizationId,
        $or: [{ owner: userId }, { isShared: true }],
      }).populate("owner", "username firstName lastName");
    } catch (error) {
      logger.error(`Error fetching organization dashboards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a dashboard by ID
   */
  async getDashboardById(dashboardId, userId) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Check access permissions
      if (
        dashboard.owner.toString() !== userId &&
        (!dashboard.isShared || !dashboard.sharedWith.includes(userId))
      ) {
        throw new Error("You don't have access to this dashboard");
      }

      // Update last modified if it's being viewed
      dashboard.lastModified = new Date();
      await dashboard.save();

      return dashboard;
    } catch (error) {
      logger.error(`Error fetching dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a dashboard
   */
  async updateDashboard(dashboardId, userId, data) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Only the owner can update
      if (dashboard.owner.toString() !== userId) {
        throw new Error("Only the owner can update this dashboard");
      }

      // If setting as default, unset any other defaults
      if (data.isDefault) {
        await Dashboard.updateMany(
          { owner: userId, isDefault: true, _id: { $ne: dashboardId } },
          { $set: { isDefault: false } }
        );
      }

      // Update fields
      const updateFields = [
        "name",
        "description",
        "isDefault",
        "isShared",
        "sharedWith",
        "widgets",
        "refreshInterval",
      ];

      updateFields.forEach((field) => {
        if (data[field] !== undefined) {
          dashboard[field] = data[field];
        }
      });

      dashboard.lastModified = new Date();
      await dashboard.save();

      return dashboard;
    } catch (error) {
      logger.error(`Error updating dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(dashboardId, userId) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Only the owner can delete
      if (dashboard.owner.toString() !== userId) {
        throw new Error("Only the owner can delete this dashboard");
      }

      await dashboard.remove();

      return { success: true };
    } catch (error) {
      logger.error(`Error deleting dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a widget to a dashboard
   */
  async addWidget(dashboardId, userId, widgetData) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Only the owner can add widgets
      if (dashboard.owner.toString() !== userId) {
        throw new Error("Only the owner can add widgets to this dashboard");
      }

      // Add widget
      dashboard.widgets.push({
        ...widgetData,
        lastRefreshed: new Date(),
      });

      dashboard.lastModified = new Date();
      await dashboard.save();

      return dashboard.widgets[dashboard.widgets.length - 1];
    } catch (error) {
      logger.error(`Error adding widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a widget
   */
  async updateWidget(dashboardId, widgetId, userId, widgetData) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Only the owner can update widgets
      if (dashboard.owner.toString() !== userId) {
        throw new Error("Only the owner can update widgets");
      }

      // Find the widget
      const widgetIndex = dashboard.widgets.findIndex(
        (w) => w._id.toString() === widgetId
      );

      if (widgetIndex === -1) {
        throw new Error("Widget not found");
      }

      // Update widget fields
      const updateFields = ["title", "size", "position", "config"];

      updateFields.forEach((field) => {
        if (widgetData[field] !== undefined) {
          dashboard.widgets[widgetIndex][field] = widgetData[field];
        }
      });

      dashboard.widgets[widgetIndex].lastRefreshed = new Date();
      dashboard.lastModified = new Date();

      await dashboard.save();

      return dashboard.widgets[widgetIndex];
    } catch (error) {
      logger.error(`Error updating widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a widget
   */
  async deleteWidget(dashboardId, widgetId, userId) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Only the owner can delete widgets
      if (dashboard.owner.toString() !== userId) {
        throw new Error("Only the owner can delete widgets");
      }

      // Find and remove the widget
      const widgetIndex = dashboard.widgets.findIndex(
        (w) => w._id.toString() === widgetId
      );

      if (widgetIndex === -1) {
        throw new Error("Widget not found");
      }

      dashboard.widgets.splice(widgetIndex, 1);
      dashboard.lastModified = new Date();

      await dashboard.save();

      return { success: true };
    } catch (error) {
      logger.error(`Error deleting widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get widget data
   */
  async getWidgetData(dashboardId, widgetId, userId) {
    try {
      const dashboard = await Dashboard.findById(dashboardId);

      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      // Check access permissions
      if (
        dashboard.owner.toString() !== userId &&
        (!dashboard.isShared || !dashboard.sharedWith.includes(userId))
      ) {
        throw new Error("You don't have access to this dashboard");
      }

      // Find the widget
      const widget = dashboard.widgets.find(
        (w) => w._id.toString() === widgetId
      );

      if (!widget) {
        throw new Error("Widget not found");
      }

      // Get data based on widget type
      let data;

      switch (widget.type) {
        case "timeTracking":
          data = await reportService.getTimeTrackingReport({
            ...widget.config.filters,
            groupBy: widget.config.groupBy || "day",
          });
          break;

        case "taskCompletion":
          data = await reportService.getTaskCompletionReport({
            ...widget.config.filters,
            period: widget.config.period || "daily",
            groupBy: widget.config.groupBy || "date",
          });
          break;

        case "productivity":
          data = await reportService.getOrganizationProductivityReport(
            widget.config.filters.organizationId,
            widget.config.filters.startDate,
            widget.config.filters.endDate
          );
          break;

        case "memberPerformance":
          const productivityReport =
            await reportService.getOrganizationProductivityReport(
              widget.config.filters.organizationId,
              widget.config.filters.startDate,
              widget.config.filters.endDate
            );
          data = productivityReport.memberStats;
          break;

        case "statusDistribution":
          const statusReport =
            await reportService.getOrganizationProductivityReport(
              widget.config.filters.organizationId,
              widget.config.filters.startDate,
              widget.config.filters.endDate
            );
          data = statusReport.distributions.taskStatus;
          break;

        case "custom":
          // Custom widgets might need specific handling
          data = { message: "Custom widget data needs implementation" };
          break;

        default:
          data = { error: "Unknown widget type" };
      }

      // Update last refreshed timestamp
      widget.lastRefreshed = new Date();
      await dashboard.save();

      return {
        widgetId: widget._id,
        type: widget.type,
        title: widget.title,
        data,
        lastRefreshed: widget.lastRefreshed,
      };
    } catch (error) {
      logger.error(`Error getting widget data: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DashboardService();
