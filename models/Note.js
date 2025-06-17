import mongoose from "mongoose";
const { Schema } = mongoose;

const NoteSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    content: {
      type: String,
      default: "",
      maxlength: [50000, "Content cannot exceed 50,000 characters"],
    }, // Supports Markdown content
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    isShared: { type: Boolean, default: false },
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        validate: {
          validator: function (values) {
            return values.every((value) => mongoose.isValidObjectId(value));
          },
          message: "Invalid user ID in sharedWith array",
        },
      },
    ],

    // Organization
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (value) {
            return value.length <= 30;
          },
          message: "Tag cannot exceed 30 characters",
        },
      },
    ],
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Priority must be low, medium, or high",
      },
      default: "medium",
    },

    // Rich Content
    attachments: [
      {
        filename: {
          type: String,
          trim: true,
          required: [true, "Attachment filename is required"],
        },
        url: {
          type: String,
          trim: true,
          required: [true, "Attachment URL is required"],
          validate: {
            validator: function (value) {
              // Basic URL validation
              const urlRegex =
                /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
              return urlRegex.test(value);
            },
            message: "Invalid URL format",
          },
        },
        type: {
          type: String,
          trim: true,
        },
        size: {
          type: Number,
          min: [0, "Size must be a positive number"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    color: {
      type: String,
      default: "#ffffff",
      validate: {
        validator: function (value) {
          // Validate hex color code
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
        },
        message: "Invalid color hex code",
      },
    },

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
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: [true, "Collaborator user is required"],
        },
        role: {
          type: String,
          enum: {
            values: ["viewer", "editor", "owner"],
            message: "Collaborator role must be viewer, editor, or owner",
          },
          default: "viewer",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    // Reminders
    reminder: {
      date: {
        type: Date,
        validate: {
          validator: function (value) {
            // Only validate if reminder is enabled and a date is provided
            if (this.reminder.isEnabled && value) {
              return value > new Date();
            }
            return true;
          },
          message: "Reminder date must be in the future",
        },
      },
      isEnabled: { type: Boolean, default: false },
      notificationSent: { type: Boolean, default: false },
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

// Virtual for estimated reading time based on words per minute
NoteSchema.virtual("readingTimeFormatted").get(function () {
  if (this.readingTime < 1) {
    return "less than a minute";
  }
  return `${this.readingTime} min${this.readingTime !== 1 ? "s" : ""}`;
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

  // Increment version on content change
  if (this.isModified("content")) {
    this.version += 1;
  }

  next();
});

// Static method to find recent notes
NoteSchema.statics.findRecentNotes = async function (userId, limit = 5) {
  return this.find({ owner: userId, isArchived: false })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("title preview updatedAt readingTimeFormatted")
    .lean();
};

// Static method to search notes
NoteSchema.statics.searchNotes = async function (
  userId,
  searchTerm,
  options = {}
) {
  const query = {
    owner: userId,
    $or: [
      { title: { $regex: searchTerm, $options: "i" } },
      { content: { $regex: searchTerm, $options: "i" } },
      { tags: { $regex: searchTerm, $options: "i" } },
    ],
  };

  // Add additional filters from options
  if (options.isArchived !== undefined) {
    query.isArchived = options.isArchived;
  }

  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 20)
    .select(
      options.select ||
        "title preview updatedAt readingTimeFormatted tags category"
    )
    .lean();
};

// Indexes for faster queries
NoteSchema.index({ owner: 1, isArchived: 1 });
NoteSchema.index({ owner: 1, isPinned: 1 });
NoteSchema.index({ owner: 1, category: 1 });
NoteSchema.index({ owner: 1, tags: 1 });
NoteSchema.index({ owner: 1, updatedAt: -1 });
NoteSchema.index({ title: "text", content: "text", tags: "text" });

const Note = mongoose.model("Note", NoteSchema);

export default Note;
