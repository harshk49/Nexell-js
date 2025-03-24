const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "in progress", "completed", "cancelled", "on hold"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reminders: [{ type: Date }],

    // Task Organization
    category: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    parentTask: { type: Schema.Types.ObjectId, ref: "Task" },
    subtasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],

    // Progress Tracking
    progress: { type: Number, default: 0, min: 0, max: 100 },
    estimatedTime: { type: Number, default: 0 }, // in minutes
    actualTime: { type: Number, default: 0 }, // in minutes
    startDate: { type: Date },
    completedAt: { type: Date },
    lastUpdated: { type: Date },

    // Task Details
    attachments: [
      {
        filename: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, trim: true },
        size: Number,
      },
    ],
    color: { type: String, default: "#ffffff" },
    location: { type: String },
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      interval: { type: Number, default: 1 },
      endDate: { type: Date },
    },

    // Collaboration
    assignedTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Task Status
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for task duration (in minutes)
TaskSchema.virtual("duration").get(function () {
  if (!this.startDate || !this.completedAt) return null;
  return Math.round((this.completedAt - this.startDate) / 60000);
});

// Virtual for overdue status
TaskSchema.virtual("isOverdue").get(function () {
  if (
    !this.dueDate ||
    ["completed", "cancelled", "on hold"].includes(this.status)
  ) {
    return false;
  }
  return new Date() > this.dueDate;
});

// Pre-save middleware
TaskSchema.pre("save", function (next) {
  // Update lastUpdated
  this.lastUpdated = new Date();

  // Update completedAt when status changes
  if (this.isModified("status")) {
    if (this.status === "completed") {
      this.completedAt = new Date();
    } else {
      this.completedAt = null; // Reset if reopened
    }
  }

  next();
});

// Indexes for faster queries
TaskSchema.index({ owner: 1, status: 1 });
TaskSchema.index({ owner: 1, dueDate: 1 });
TaskSchema.index({ owner: 1, priority: 1 });
TaskSchema.index({ owner: 1, category: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ tags: 1 });

module.exports = mongoose.model("Task", TaskSchema);
