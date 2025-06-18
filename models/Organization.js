import mongoose from "mongoose";
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema(
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
    logo: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    // Organization Settings & Configuration
    settings: {
      defaultTaskView: {
        type: String,
        enum: ["list", "board", "calendar"],
        default: "board",
      },
      defaultNoteView: {
        type: String,
        enum: ["list", "grid"],
        default: "grid",
      },
      timeTracking: {
        enabled: { type: Boolean, default: true },
        roundingInterval: {
          type: Number,
          enum: [1, 5, 10, 15, 30, 60], // minutes
          default: 1,
        },
        requireComment: { type: Boolean, default: false },
      },
      permissions: {
        memberInvite: {
          type: String,
          enum: ["admin", "member", "none"],
          default: "admin",
        },
        taskCreation: {
          type: String,
          enum: ["admin", "member", "none"],
          default: "member",
        },
        noteCreation: {
          type: String,
          enum: ["admin", "member", "none"],
          default: "member",
        },
      },
    },
    // Linked resources
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    members: [{ type: Schema.Types.ObjectId, ref: "Membership" }],
    invitations: [{ type: Schema.Types.ObjectId, ref: "Invitation" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for member count
OrganizationSchema.virtual("memberCount").get(async function () {
  const count = await mongoose.models.Membership.countDocuments({
    organization: this._id,
    status: "active",
  });
  return count;
});

// Create organization indexes
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ createdBy: 1 });

export default mongoose.model("Organization", OrganizationSchema);
