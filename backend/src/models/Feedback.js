const mongoose = require("mongoose");

const lifecycleEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["submitted", "open", "in_review", "resolved", "closed", "rejected"],
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["feedback", "complaint"],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    status: {
      type: String,
      enum: ["submitted", "open", "in_review", "resolved", "closed", "rejected"],
      default: "submitted",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    serviceType: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    resolutionNote: {
      type: String,
      default: "",
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    lifecycleHistory: {
      type: [lifecycleEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);

