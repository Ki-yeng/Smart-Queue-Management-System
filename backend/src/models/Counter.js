// Import mongoose
const mongoose = require("mongoose");

// Define the Service Counter schema
const counterSchema = new mongoose.Schema(
  {
    // Counter name: e.g. "Counter 1", "Window 3", "Help Desk A"
    counterName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Which service this counter handles
    serviceType: {
      type: String,
      required: true,
      enum: [
        "Admissions",
        "Finance",
        "Examinations",
        "Library",
        "Accommodation",
        "Student Records",
        "ICT Support",
        "Counselling",
        "General Enquiries"
      ],
    },

    // Current operational status
    status: {
      type: String,
      enum: ["open", "closed", "busy"],
      default: "closed",
    },

    // The ticket currently being served at this counter
    currentTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
  },

  // Auto timestamps: createdAt, updatedAt
  {
    timestamps: true,
  }
);

// Export model
module.exports = mongoose.model("Counter", counterSchema);
