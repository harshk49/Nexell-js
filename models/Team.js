const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TeamSchema = new Schema(
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
    leader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["member", "senior", "lead"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    type: {
      type: String,
      enum: [
        "department",
        "project",
        "functional",
        "cross-functional",
        "virtual",
      ],
      default: "project",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    capabilities: [
      {
        name: {
          type: String,
          trim: true,
        },
        level: {
          type: Number,
          min: 1,
          max: 5,
          default: 3,
        },
      },
    ],
    timeTracking: {
      capacity: {
        type: Number, // Weekly hours capacity
        default: 40,
      },
      utilizationTarget: {
        type: Number, // Target utilization percent
        default: 80,
      },
      currentUtilization: {
        type: Number, // Current utilization percent
        default: 0,
      },
    },
    workSchedule: {
      timeZone: {
        type: String,
        default: "UTC",
      },
      workDays: {
        type: [Number], // 1-7 representing Monday-Sunday
        default: [1, 2, 3, 4, 5], // Default to Monday-Friday
      },
      workHours: {
        start: {
          type: String,
          default: "09:00",
        },
        end: {
          type: String,
          default: "17:00",
        },
      },
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
      },
    ],
    communication: {
      channels: [
        {
          type: {
            type: String,
            enum: ["chat", "email", "video", "other"],
          },
          provider: {
            type: String,
          },
          details: {
            type: String,
          },
        },
      ],
      meetingSchedule: [
        {
          name: {
            type: String,
          },
          recurrence: {
            type: String,
            enum: ["daily", "weekly", "biweekly", "monthly", "custom"],
          },
          day: {
            type: Number,
          },
          time: {
            type: String,
          },
          duration: {
            type: Number, // Minutes
          },
        },
      ],
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

// Method to calculate the team's current utilization
TeamSchema.methods.calculateUtilization = async function () {
  const TimeLog = mongoose.model("TimeLog");
  const memberIds = this.members.map((member) => member.user);

  // Calculate total capacity in minutes for the team
  const weeklyCapacityMinutes =
    this.timeTracking.capacity * 60 * this.members.length;

  // Get one week of time logs
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const logs = await TimeLog.find({
    user: { $in: memberIds },
    endTime: { $gte: oneWeekAgo },
    duration: { $gt: 0 },
  });

  // Calculate total time spent
  const totalTimeMinutes = logs.reduce((total, log) => total + log.duration, 0);

  // Calculate utilization percentage
  if (weeklyCapacityMinutes > 0) {
    this.timeTracking.currentUtilization = Math.min(
      100,
      Math.round((totalTimeMinutes / weeklyCapacityMinutes) * 100)
    );
  }

  return this.timeTracking.currentUtilization;
};

module.exports = mongoose.model("Team", TeamSchema);
