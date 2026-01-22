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

    // Staff member assigned to this counter
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Assignment history to track staff rotations
    assignmentHistory: [
      {
        staffId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        staffName: String,
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        unassignedAt: Date,
        reason: String,
      },
    ],

    // Service types this counter can handle (can be multiple)
    serviceTypes: [
      {
        type: String,
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
    ],

    // Availability status (independent from operational status)
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable", "maintenance", "on_break"],
      default: "available",
    },

    // Timestamp of last availability status change
    lastAvailabilityChange: {
      type: Date,
      default: Date.now,
    },

    // Reason for unavailability (maintenance, equipment issue, etc.)
    unavailabilityReason: {
      type: String,
      default: null,
    },

    // Expected time when counter will be back online
    estimatedReturnTime: {
      type: Date,
      default: null,
    },

    // Availability history to track maintenance and downtime
    availabilityHistory: [
      {
        status: {
          type: String,
          enum: ["available", "unavailable", "maintenance", "on_break"],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedUntil: Date,
        reason: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Performance metrics
    performanceMetrics: {
      totalTicketsServed: {
        type: Number,
        default: 0,
      },
      avgServiceTime: {
        type: Number,
        default: 0,
      },
      totalServiceTime: {
        type: Number,
        default: 0, // in seconds
      },
      minServiceTime: {
        type: Number,
        default: null, // in seconds
      },
      maxServiceTime: {
        type: Number,
        default: null, // in seconds
      },
      ticketsCompletedToday: {
        type: Number,
        default: 0,
      },
      lastMaintenanceDate: Date,
      uptimePercentage: {
        type: Number,
        default: 100,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // Service time tracking by service type
    serviceMetricsPerType: [
      {
        serviceType: {
          type: String,
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
        ticketsServed: {
          type: Number,
          default: 0,
        },
        avgServiceTime: {
          type: Number,
          default: 0,
        },
        totalServiceTime: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Daily metrics history for trend analysis
    dailyMetrics: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        ticketsServed: {
          type: Number,
          default: 0,
        },
        avgServiceTime: {
          type: Number,
          default: 0,
        },
        peakHour: String,
        customerSatisfaction: Number,
      },
    ],

  },

  // Auto timestamps: createdAt, updatedAt
  {
    timestamps: true,
  }
);

// Export model
module.exports = mongoose.model("Counter", counterSchema);
