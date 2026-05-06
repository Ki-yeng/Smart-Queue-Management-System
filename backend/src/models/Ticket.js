const mongoose = require("mongoose");

const SERVICE_ENUM = [
  "Admissions",
  "Finance",
  "Examinations",
  "Registry",
  "Library",
  "Accommodation",
  "Student Records",
  "ICT Support",
  "Counselling",
  "General Enquiries",
];

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: Number,
      required: true,
    },

    // Existing field used by current queue flows
    serviceType: {
      type: String,
      required: true,
      enum: SERVICE_ENUM,
    },

    // Required admin analytics field name
    department: {
      type: String,
      default: null,
      enum: SERVICE_ENUM,
    },

    status: {
      type: String,
      enum: ["waiting", "serving", "completed", "on_hold", "cancelled", "transferred", "no_show"],
      default: "waiting",
    },

    priority: {
      type: String,
      enum: ["normal", "high", "urgent", "vip"],
      default: "normal",
    },
    isVIP: {
      type: Boolean,
      default: false,
    },
    priorityScore: {
      type: Number,
      default: 0,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    studentName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    // Required admin analytics fields
    servedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    serviceStartTime: {
      type: Date,
      default: null,
    },
    serviceEndTime: {
      type: Date,
      default: null,
    },

    // Backward-compatible fields used elsewhere in the codebase
    servedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    transferredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    parentTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    childTicketIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
      },
    ],

    transferHistory: [
      {
        fromCounterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Counter",
        },
        toCounterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Counter",
        },
        transferredAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],

    counterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Counter",
      default: null,
    },

    // Virtual queue check-in/no-show workflow
    checkInRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    nearTurnNotifiedAt: {
      type: Date,
      default: null,
      index: true,
    },
    noShowAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Basic performance hardening indexes for high-frequency dashboard and queue queries.
ticketSchema.index({ status: 1 });
ticketSchema.index({ serviceType: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, serviceType: 1, createdAt: -1 });

// Keep legacy and new analytics fields aligned.
ticketSchema.pre("validate", function syncFields() {
  if (!this.department && this.serviceType) this.department = this.serviceType;
  if (!this.serviceType && this.department) this.serviceType = this.department;

  if (!this.serviceStartTime && this.servedAt) this.serviceStartTime = this.servedAt;
  if (!this.servedAt && this.serviceStartTime) this.servedAt = this.serviceStartTime;

  if (!this.serviceEndTime && this.completedAt) this.serviceEndTime = this.completedAt;
  if (!this.completedAt && this.serviceEndTime) this.completedAt = this.serviceEndTime;
});

module.exports = mongoose.model("Ticket", ticketSchema);
