const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    status: { type: String, default: "unknown" },
    note: { type: String, default: "" },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true },
    office: {
      type: String,
      required: true,
      enum: ["finance", "registry", "ict", "library", "hostel", "security"],
    },
    operation: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    feeStatus: { type: sectionSchema, default: () => ({}) },
    academicStatus: { type: sectionSchema, default: () => ({}) },
    libraryStatus: { type: sectionSchema, default: () => ({}) },
    hostelStatus: { type: sectionSchema, default: () => ({}) },
    securityStatus: { type: sectionSchema, default: () => ({}) },
    clearanceStatus: { type: sectionSchema, default: () => ({}) },
    pendingRequests: { type: [requestSchema], default: [] },
    historicalServiceRecords: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);

