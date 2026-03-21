const mongoose = require("mongoose");

const SERVICE_ENUM = [
  "Admissions",
  "Finance",
  "Examinations",
  "Library",
  "Accommodation",
  "Student Records",
  "ICT Support",
  "Counselling",
  "General Enquiries",
];

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: SERVICE_ENUM,
      required: true,
    },
    appointmentTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["booked", "joined_queue", "cancelled"],
      default: "booked",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    linkedTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);

