const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TimeLogSchema = new Schema(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdManually: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate duration when endTime exists
TimeLogSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000); // duration in seconds
    this.isRunning = false;
  } else if (this.startTime && !this.endTime) {
    this.isRunning = true;
  }
  next();
});

// Virtuals for formatted duration
TimeLogSchema.virtual("formattedDuration").get(function () {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});

// Create indexes for efficient queries
TimeLogSchema.index({ user: 1, task: 1 });
TimeLogSchema.index({ user: 1, startTime: -1 });
TimeLogSchema.index({ task: 1, startTime: -1 });
TimeLogSchema.index({ user: 1, isRunning: 1 });

module.exports = mongoose.model("TimeLog", TimeLogSchema);
