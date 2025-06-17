import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema } = mongoose;

/**
 * User Schema - represents a user in the application
 */
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      // Disallow special characters in username
      match: [
        /^[a-zA-Z0-9._-]+$/,
        "Username can only contain letters, numbers, dots, underscores and dashes",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      select: false, // Don't include password in query results by default
      minlength: [8, "Password must be at least 8 characters long"],
      // Only required for non-OAuth users
      required: function () {
        return !this.googleId && !this.githubId;
      },
    },

    // OAuth providers
    googleId: { type: String, sparse: true, unique: true },
    githubId: { type: String, sparse: true, unique: true },

    // Profile Information
    firstName: {
      type: String,
      trim: true,
      required: [true, "First name is required"],
    },
    lastName: { type: String, trim: true },
    avatar: { type: String, trim: true },
    bio: { type: String, maxLength: [500, "Bio cannot exceed 500 characters"] },

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
        provider: { type: String, enum: ["local", "google", "github"] },
      },
    ],
    createdTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
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

// Virtual for initials (for avatar fallback)
userSchema.virtual("initials").get(function () {
  const firstInitial = this.firstName ? this.firstName.charAt(0) : "";
  const lastInitial = this.lastName ? this.lastName.charAt(0) : "";
  return (
    (firstInitial + lastInitial).toUpperCase() ||
    this.username.charAt(0).toUpperCase()
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

// Method to check if password is correct
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token expires in 10 minutes
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Indexes for faster queries
userSchema.index({ email: 1, username: 1 });
userSchema.index({ currentOrganization: 1 });

const User = mongoose.model("User", userSchema);

export default User;
