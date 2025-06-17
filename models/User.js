const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String }, // Not required for OAuth users

    // OAuth providers
    googleId: { type: String, sparse: true, unique: true },
    githubId: { type: String, sparse: true, unique: true },

    // Profile Information
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true },
    avatar: { type: String, trim: true },
    bio: { type: String, maxLength: 500 },

    // Account Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // References to Tasks and Notes
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    notes: [{ type: Schema.Types.ObjectId, ref: "Note" }],

    // Organization Memberships
    organizations: [{ type: Schema.Types.ObjectId, ref: "Membership" }],
    currentOrganization: { type: Schema.Types.ObjectId, ref: "Organization" },
    invitations: [{ type: Schema.Types.ObjectId, ref: "Invitation" }],

    // User Preferences
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
        required: true,
      },
      notifications: { type: Boolean, default: true },
      taskView: {
        type: String,
        enum: ["list", "board", "calendar"],
        default: "list",
      },
      noteView: { type: String, enum: ["list", "grid"], default: "list" },
      timeTracking: {
        roundingInterval: {
          type: Number,
          enum: [1, 5, 10, 15, 30, 60], // minutes
          default: 1,
        },
        idleDetection: {
          enabled: { type: Boolean, default: true },
          threshold: { type: Number, default: 10, min: 1, max: 60 }, // minutes
          action: {
            type: String,
            enum: ["prompt", "discard", "keep"],
            default: "prompt",
          },
        },
        alertsEnabled: { type: Boolean, default: true },
        longRunningThreshold: { type: Number, default: 8, min: 1, max: 24 }, // hours
        workingHours: {
          enabled: { type: Boolean, default: false },
          start: { type: String, default: "09:00" }, // HH:MM format
          end: { type: String, default: "17:00" }, // HH:MM format
          workDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5], // Monday=1, Sunday=7
          },
        },
        pomodoroSettings: {
          enabled: { type: Boolean, default: false },
          workDuration: { type: Number, default: 25, min: 1, max: 60 }, // minutes
          breakDuration: { type: Number, default: 5, min: 1, max: 30 }, // minutes
          longBreakDuration: { type: Number, default: 15, min: 1, max: 60 }, // minutes
          sessionsBeforeLongBreak: {
            type: Number,
            default: 4,
            min: 1,
            max: 10,
          },
        },
      },
    },

    // Activity Tracking
    lastLogin: { type: Date, default: Date.now },
    loginHistory: [
      {
        date: { type: Date, default: Date.now },
        ip: String,
        userAgent: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return (
    `${this.firstName || ""} ${this.lastName || ""}`.trim() || this.username
  );
});

// Pre-save middleware to hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes for faster queries
userSchema.index({ email: 1, username: 1 });

module.exports = mongoose.model("User", userSchema);
