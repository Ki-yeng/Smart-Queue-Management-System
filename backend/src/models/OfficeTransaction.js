const mongoose = require("mongoose");

const officeTransactionSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    office: {
      type: String,
      required: true,
      enum: ["finance", "registry", "ict", "library", "hostel", "security"],
      index: true,
    },
    operation: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["initiated", "processing", "success", "failed"],
      default: "initiated",
      index: true,
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeTransaction", officeTransactionSchema);

