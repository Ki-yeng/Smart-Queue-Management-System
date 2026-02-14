const mongoose = require("mongoose");

const clearanceSectionSchema = new mongoose.Schema(
  {
    status: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const clearanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    finance: { type: clearanceSectionSchema, default: () => ({}) },
    academics: { type: clearanceSectionSchema, default: () => ({}) },
    examinations: { type: clearanceSectionSchema, default: () => ({}) },
    library: { type: clearanceSectionSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Clearance", clearanceSchema);
