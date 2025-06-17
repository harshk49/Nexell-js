const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Polymorphic relationship - can be attached to Task, TimeLog, Project, etc.
    entityType: {
      type: String,
      required: true,
      enum: ["Task", "TimeLog", "Project", "Team", "Note"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
    },
    // For comment threads (replies)
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    mentions: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        notified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    attachments: [
      {
        name: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
        size: {
          type: Number,
        },
      },
    ],
    reactions: [
      {
        type: {
          type: String, // emoji code
          trim: true,
        },
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for replies (child comments)
CommentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
});

// Middleware to clean up mentions format from raw input
CommentSchema.pre("save", function (next) {
  // If content has @mentions in the format @username, extract them
  if (this.isModified("content")) {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = this.content.match(mentionRegex);

    if (matches && matches.length > 0) {
      // This would normally trigger a lookup of users by username
      // and add them to the mentions array
      // But we'll keep it simple for now
    }
  }
  next();
});

module.exports = mongoose.model("Comment", CommentSchema);
