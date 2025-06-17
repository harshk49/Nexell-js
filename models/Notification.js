const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "mention",
        "assignment",
        "comment",
        "due_date",
        "status_change",
        "timer_reminder",
        "idle_detection",
        "pomodoro",
        "team_invite",
        "project_invite",
        "integration_alert",
      ],
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Polymorphic relationship - can be related to Task, TimeLog, Project, etc.
    entityType: {
      type: String,
      required: true,
      enum: ["Task", "TimeLog", "Project", "Team", "Comment", "Note", "User"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isActionRequired: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    deliveryChannels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
        sent: {
          type: Boolean,
          default: false,
        },
      },
      push: {
        type: Boolean,
        default: false,
        sent: {
          type: Boolean,
          default: false,
        },
      },
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index to improve query performance
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
