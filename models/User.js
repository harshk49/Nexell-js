const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    // Profile Information
    firstName: { type: String, trim: true },
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

    // User Preferences
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: { type: Boolean, default: true },
      taskView: {
        type: String,
        enum: ["list", "board", "calendar"],
        default: "list",
      },
      noteView: { type: String, enum: ["list", "grid"], default: "list" },
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
