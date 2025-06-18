import crypto from "crypto";

import mongoose from "mongoose";
const Schema = mongoose.Schema;

const InvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    message: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for checking if invitation is expired
InvitationSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

// Pre-save hook to generate a token if not provided
InvitationSchema.pre("save", function (next) {
  if (!this.token || this.isNew) {
    this.token = crypto.randomBytes(32).toString("hex");
  }
  next();
});

// Create indexes
InvitationSchema.index({ email: 1, organization: 1 }, { unique: true });
InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ organization: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

export default mongoose.model("Invitation", InvitationSchema);
