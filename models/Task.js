import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Task Schema - represents a task in the application
 */
const TaskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [5000, "Task description cannot exceed 5000 characters"],
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // If dueDate is set, ensure it's not in the past when creating
          return !value || this.isNew === false || value >= new Date();
        },
        message: "Due date cannot be in the past",
      },
    },
    status: {
      type: String,
      enum: {
        values: [
          "todo",
          "in-progress",
          "review",
          "completed",
          "cancelled",
          "on-hold",
        ],
        message: "{VALUE} is not a valid status",
      },
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "urgent"],
        message: "{VALUE} is not a valid priority",
      },
      default: "medium",
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task owner is required"],
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    reminders: [{ type: Date }],

    // Task Organization
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      validate: {
        validator: function (value) {
          // Prevent self-referencing
          return (
            !value || !this._id || value.toString() !== this._id.toString()
          );
        },
        message: "A task cannot be its own parent",
      },
    },
    subtasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    // Progress Tracking
    progress: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be less than 0%"],
      max: [100, "Progress cannot exceed 100%"],
    },
    estimatedTime: {
      type: Number,
      default: 0,
      min: [0, "Estimated time cannot be negative"],
    }, // in minutes
    actualTime: {
      type: Number,
      default: 0,
      min: [0, "Actual time cannot be negative"],
    }, // in minutes
    startDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // If both startDate and dueDate are set, ensure startDate is before dueDate
          return !value || !this.dueDate || value <= this.dueDate;
        },
        message: "Start date must be before due date",
      },
    },
    completedAt: { type: Date },
    lastUpdated: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Task Details
    attachments: [
      {
        filename: { type: String, trim: true, required: true },
        url: { type: String, trim: true, required: true },
        type: { type: String, trim: true },
        size: { type: Number, min: [0, "File size cannot be negative"] },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    color: {
      type: String,
      default: "#ffffff",
      match: [
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        "Invalid color format. Use hex format (e.g., #ffffff)",
      ],
    },
    location: {
      type: String,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: {
          values: [
            "daily",
            "weekdays",
            "weekly",
            "biweekly",
            "monthly",
            "quarterly",
            "yearly",
          ],
          message: "{VALUE} is not a valid frequency",
        },
      },
      interval: {
        type: Number,
        default: 1,
        min: [1, "Interval must be at least 1"],
        max: [365, "Interval cannot exceed 365"],
      },
      endDate: { type: Date },
      endAfterOccurrences: {
        type: Number,
        min: [1, "Occurrences must be at least 1"],
      },
      lastGenerated: { type: Date },
    },

    // Collaboration
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    watchers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [2000, "Comment cannot exceed 2000 characters"],
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
        isEdited: { type: Boolean, default: false },
        mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
        attachments: [
          {
            filename: String,
            url: String,
            type: String,
            size: Number,
          },
        ],
      },
    ],

    // Time Tracking
    timeEntries: [{ type: Schema.Types.ObjectId, ref: "TimeLog" }],
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: [0, "Total time spent cannot be negative"],
    }, // in seconds
    isTimeTrackingEnabled: { type: Boolean, default: true },
    hasActiveTimer: { type: Boolean, default: false },
    lastActiveTimerId: { type: Schema.Types.ObjectId, ref: "TimeLog" },

    // Task Status
    isArchived: { type: Boolean, default: false, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    isPrivate: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
    ["completed", "cancelled", "on-hold"].includes(this.status)
  ) {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for days until due
TaskSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;

  const now = new Date();
  const dueDate = new Date(this.dueDate);

  // Set both dates to midnight for accurate day calculation
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  // Calculate difference in days
  const diffTime = dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for whether the task is blocked
TaskSchema.virtual("isBlocked").get(function () {
  return this.dependencies && this.dependencies.length > 0;
});

// Pre-save middleware
TaskSchema.pre("save", function (next) {
  // Update lastUpdated
  this.lastUpdated = new Date();

  // Update completedAt when status changes
  if (this.isModified("status")) {
    if (this.status === "completed") {
      this.completedAt = new Date();

      // Set progress to 100% when completed
      this.progress = 100;
    } else if (
      this.previouslyModified("status") &&
      this.previousValue("status") === "completed"
    ) {
      this.completedAt = null; // Reset if reopened
    }
  }

  // Ensure subtasks array has unique values
  if (this.subtasks && this.subtasks.length > 0) {
    this.subtasks = [...new Set(this.subtasks.map((id) => id.toString()))].map(
      (id) => mongoose.Types.ObjectId(id)
    );
  }

  // Ensure dependencies array has unique values
  if (this.dependencies && this.dependencies.length > 0) {
    this.dependencies = [
      ...new Set(this.dependencies.map((id) => id.toString())),
    ].map((id) => mongoose.Types.ObjectId(id));
  }

  next();
});

// Static method to get tasks due today
TaskSchema.statics.getDueToday = function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    owner: userId,
    dueDate: { $gte: today, $lt: tomorrow },
    status: { $ne: "completed" },
  });
};

// Static method to get overdue tasks
TaskSchema.statics.getOverdue = function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    owner: userId,
    dueDate: { $lt: today },
    status: { $ne: "completed" },
  });
};

// Indexes for faster queries
TaskSchema.index({ owner: 1, status: 1 });
TaskSchema.index({ owner: 1, dueDate: 1 });
TaskSchema.index({ owner: 1, priority: 1 });
TaskSchema.index({ owner: 1, category: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ tags: 1 });
TaskSchema.index({ owner: 1, createdAt: -1 });
TaskSchema.index({ owner: 1, updatedAt: -1 });
TaskSchema.index({ title: "text", description: "text" });
TaskSchema.index({ owner: 1, status: 1, dueDate: 1 });
TaskSchema.index({ owner: 1, status: 1, priority: 1 });
TaskSchema.index({ owner: 1, isArchived: 1, isPinned: 1 });
TaskSchema.index({ owner: 1, category: 1, status: 1 });
TaskSchema.index({ owner: 1, assignedTo: 1, status: 1 });
TaskSchema.index({
  owner: 1,
  "recurring.isRecurring": 1,
  "recurring.frequency": 1,
});
TaskSchema.index({ owner: 1, startDate: 1, status: 1 });
TaskSchema.index({ owner: 1, completedAt: 1, status: 1 });

const Task = mongoose.model("Task", TaskSchema);

export default Task;
