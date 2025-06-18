import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ProjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    managers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    status: {
      type: String,
      enum: ["planning", "active", "on-hold", "completed", "archived"],
      default: "active",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    budget: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      type: {
        type: String,
        enum: ["fixed", "hourly", "none"],
        default: "none",
      },
    },
    timeTracking: {
      enabled: {
        type: Boolean,
        default: true,
      },
      estimatedHours: {
        type: Number,
        default: 0,
      },
      actualHours: {
        type: Number,
        default: 0,
      },
      remainingHours: {
        type: Number,
        default: 0,
      },
      rate: {
        type: Number,
        default: 0,
      },
    },
    workflow: {
      stages: [
        {
          name: {
            type: String,
            trim: true,
          },
          order: {
            type: Number,
          },
        },
      ],
      automations: [
        {
          trigger: {
            type: String,
            enum: ["status_change", "due_date", "assignment", "comment"],
          },
          condition: {
            type: Object,
            default: {},
          },
          action: {
            type: String,
            enum: ["change_status", "notify", "assign", "add_tag"],
          },
          actionConfig: {
            type: Object,
            default: {},
          },
        },
      ],
    },
    customFields: [
      {
        name: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          enum: ["text", "number", "date", "boolean", "select"],
        },
        options: [String],
        value: Schema.Types.Mixed,
        isRequired: {
          type: Boolean,
          default: false,
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    integrations: {
      calendar: {
        enabled: {
          type: Boolean,
          default: false,
        },
        provider: {
          type: String,
          enum: ["google", "microsoft", "apple", "none"],
          default: "none",
        },
        syncId: String,
      },
      externalId: {
        type: String,
        default: "",
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for tasks in this project
ProjectSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
});

// Pre-save hook to update remaining hours
ProjectSchema.pre("save", function (next) {
  if (this.timeTracking.estimatedHours && this.timeTracking.actualHours) {
    this.timeTracking.remainingHours = Math.max(
      0,
      this.timeTracking.estimatedHours - this.timeTracking.actualHours
    );
  }
  next();
});

export default mongoose.model("Project", ProjectSchema);
