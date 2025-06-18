import mongoose from "mongoose";
const Schema = mongoose.Schema;

const MembershipSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      manageMembers: { type: Boolean },
      manageProjects: { type: Boolean },
      manageTasks: { type: Boolean },
      manageNotes: { type: Boolean },
      viewAllTasks: { type: Boolean },
      viewAllNotes: { type: Boolean },
    },
    notificationSettings: {
      taskAssigned: { type: Boolean, default: true },
      taskUpdated: { type: Boolean, default: true },
      noteShared: { type: Boolean, default: true },
      memberJoined: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to set default permissions based on role
MembershipSchema.pre("save", function (next) {
  if (this.isModified("role") || this.isNew) {
    if (this.role === "admin") {
      this.permissions = {
        manageMembers: true,
        manageProjects: true,
        manageTasks: true,
        manageNotes: true,
        viewAllTasks: true,
        viewAllNotes: true,
      };
    } else if (this.role === "member") {
      this.permissions = {
        manageMembers: false,
        manageProjects: false,
        manageTasks: true,
        manageNotes: true,
        viewAllTasks: false,
        viewAllNotes: false,
      };
    } else if (this.role === "viewer") {
      this.permissions = {
        manageMembers: false,
        manageProjects: false,
        manageTasks: false,
        manageNotes: false,
        viewAllTasks: true,
        viewAllNotes: true,
      };
    }
  }
  next();
});

// Create unique compound index
MembershipSchema.index({ user: 1, organization: 1 }, { unique: true });
MembershipSchema.index({ organization: 1, role: 1 });
MembershipSchema.index({ organization: 1, status: 1 });

export default mongoose.model("Membership", MembershipSchema);
