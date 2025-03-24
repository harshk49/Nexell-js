const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NoteSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" }, // Supports Markdown content
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isShared: { type: Boolean, default: false },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Organization
    category: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Rich Content
    attachments: [
      {
        filename: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, trim: true },
        size: Number,
      },
    ],
    color: { type: String, default: "#ffffff" },

    // Note Status
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },

    // Metadata
    lastEdited: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    wordCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 },

    // Collaboration
    collaborators: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["viewer", "editor", "owner"],
          default: "viewer",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    // Reminders
    reminder: {
      date: Date,
      isEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for note preview
NoteSchema.virtual("preview").get(function () {
  return (
    this.content.substring(0, 150) + (this.content.length > 150 ? "..." : "")
  );
});

// Pre-save middleware to update metadata
NoteSchema.pre("save", function (next) {
  // Update lastEdited
  this.lastEdited = new Date();

  // Calculate word count
  this.wordCount = this.content.trim()
    ? this.content.trim().split(/\s+/).length
    : 0;

  // Calculate reading time (assuming 200 words per minute)
  this.readingTime = this.wordCount > 0 ? Math.ceil(this.wordCount / 200) : 0;

  // Ensure reminder.date is null if reminder is disabled
  if (!this.reminder.isEnabled) {
    this.reminder.date = null;
  }

  next();
});

// Indexes for faster queries
NoteSchema.index({ owner: 1, isArchived: 1 });
NoteSchema.index({ owner: 1, isPinned: 1 });
NoteSchema.index({ owner: 1, category: 1 });
NoteSchema.index({ tags: 1 });

module.exports = mongoose.model("Note", NoteSchema);
