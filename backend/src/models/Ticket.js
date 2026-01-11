// Import mongoose
const mongoose = require("mongoose");

// Define Ticket schema for the queue system
const ticketSchema = new mongoose.Schema(
  {
    // Auto-incremented number you will generate in the controller
    ticketNumber: {
      type: Number,
      required: true,
    },

    // Which university service the student is queuing for
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

    // Current status of the ticket
    status: {
      type: String,
      enum: ["waiting", "serving", "completed", "cancelled"],
      default: "waiting",
    },

    // Optional: student/user who created the ticket
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Time when serving starts
    servedAt: {
      type: Date,
      default: null,
    },
    counterId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Counter",
  default: null,
},

  },

  // Mongoose will automatically add createdAt and updatedAt
  {
    timestamps: true,
  }
);

// Export model
module.exports = mongoose.model("Ticket", ticketSchema);
