const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WidgetSchema = new Schema({
  type: {
    type: String,
    enum: [
      "timeTracking",
      "taskCompletion",
      "productivity",
      "memberPerformance",
      "statusDistribution",
      "custom",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  size: {
    width: { type: Number, default: 1 }, // Column span (1-4)
    height: { type: Number, default: 1 }, // Row span (1-4)
  },
  position: {
    column: { type: Number, default: 0 },
    row: { type: Number, default: 0 },
  },
  config: {
    reportType: { type: String },
    groupBy: { type: String },
    period: { type: String },
    visualization: {
      type: {
        type: String,
        enum: ["bar", "line", "pie", "table", "card", "metric"],
      },
      options: { type: Schema.Types.Mixed },
    },
    filters: { type: Schema.Types.Mixed },
  },
  lastRefreshed: { type: Date },
});

const DashboardSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    widgets: [WidgetSchema],
    refreshInterval: {
      type: Number, // Minutes
      default: 0, // 0 means manual refresh only
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Dashboard", DashboardSchema);
