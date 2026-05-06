// backend/src/controllers/ticketController.js
const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");
const User = require("../models/User");
const { calculatePriorityScore, determinePriorityLevel, sortByPriority } = require("../utils/priorityHelper");
const { findBestCounterForTicket } = require("../utils/loadBalancer");
const { updateCounterMetricsOnCompletion } = require("../utils/metricsCalculator");
const { notifyNearTurnForService } = require("../utils/queueAutomation");
const Clearance = require("../models/Clearance");
const {
  emitTicketCreated,
  emitTicketServing,
  emitTicketCompleted,
  emitTicketCancelled,
  emitTicketTransferred,
  emitTicketPriorityUpdated,
  emitQueueUpdated,
  emitCounterStatusUpdated,
  emitCounterStatusChanged,
  emitCounterStaffAssigned,
  emitCounterMetricsUpdated,
  emitCounterUpdateToStaff,
  emitTicketToCounterStaff,
  emitToServiceStaffOnly,
  emitToUserOnly,
  emitCounterUpdateToStaffAndDashboard,
  emitTicketToServiceAndDashboard,
} = require("../utils/socketEvents");

const normalizeClearance = (doc) => ({
  finance: {
    status: doc?.finance?.status || "",
    note: doc?.finance?.note || "",
  },
  academics: {
    status: doc?.academics?.status || "",
    note: doc?.academics?.note || "",
  },
  examinations: {
    status: doc?.examinations?.status || "",
    note: doc?.examinations?.note || "",
  },
  library: {
    status: doc?.library?.status || "",
    note: doc?.library?.note || "",
  },
});

const emitQueueUpdatedForService = async (io, serviceType) => {
  if (!io || !serviceType) return;
  try {
    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map((u) => u._id);

    const tickets = await Ticket.find({
      status: "waiting",
      serviceType,
      userId: { $nin: blockedIds },
    })
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name email studentYear isVIP hasAccessibilityNeeds");

    emitQueueUpdated(io, serviceType, sortByPriority(tickets));
  } catch (err) {
    console.warn("emitQueueUpdatedForService failed:", err.message);
  }
};

/**
 * Staff Smart Action: perform pre-defined actions on a ticket
 * actions: "markVIP", "markAccessibility", "setPriority", "cancel", "complete"
 */
exports.staffAction = async (req, res) => {
  try {
    const { ticketId, action, payload } = req.body;
    if (!ticketId || !action) {
      return res.status(400).json({ message: "ticketId and action are required" });
    }

    const ticket = await Ticket.findById(ticketId).populate("userId").populate("counterId");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const userId = ticket.userId?._id?.toString() || ticket.userId?.toString();
    let clearanceDoc = userId ? await Clearance.findOne({ userId }) : null;
    let context = normalizeClearance(clearanceDoc);

    switch (action) {
      case "markVIP":
        ticket.priority = "vip";
        ticket.isVIP = true;
        ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
        if (ticket.userId) await User.findByIdAndUpdate(ticket.userId, { isVIP: true });
        await ticket.save();
        break;

      case "markAccessibility":
        ticket.priority = "high";
        ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
        if (ticket.userId) await User.findByIdAndUpdate(ticket.userId, { hasAccessibilityNeeds: true });
        await ticket.save();
        break;

      case "setPriority":
        if (!payload?.priority) return res.status(400).json({ message: "priority required in payload" });
        ticket.priority = payload.priority;
        ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
        await ticket.save();
        break;

      case "cancel":
        if (ticket.status === "completed" || ticket.status === "cancelled") {
          return res.status(400).json({ message: `Cannot cancel a ${ticket.status} ticket` });
        }
        ticket.status = "cancelled";
        ticket.cancelledAt = new Date();
        await ticket.save();
        if (ticket.counterId && ticket.status === "serving") {
          await Counter.findByIdAndUpdate(ticket.counterId, { status: "open", currentTicket: null });
        }
        break;

      case "complete":
        if (ticket.status !== "serving") return res.status(400).json({ message: "Only serving tickets can be completed" });
        ticket.status = "completed";
        ticket.completedAt = new Date();
        ticket.serviceEndTime = ticket.completedAt;
        if (!ticket.serviceStartTime && ticket.servedAt) ticket.serviceStartTime = ticket.servedAt;
        await ticket.save();
        if (ticket.counterId) await updateCounterMetricsOnCompletion(ticket.counterId, ticket);
        break;

      case "confirmPayment":
        if (userId) {
          const note = payload?.note || "Payment confirmed by staff";
          clearanceDoc = await Clearance.findOneAndUpdate(
            { userId },
            {
              $set: {
                finance: { status: "PAID", note },
                examinations: { status: "CLEARED", note: "Exam access unlocked after payment" },
              },
            },
            { new: true, upsert: true }
          );
          context = normalizeClearance(clearanceDoc);
        }
        break;

      case "approveRegistration":
        if (userId) {
          const note = payload?.note || "Units registration approved";
          clearanceDoc = await Clearance.findOneAndUpdate(
            { userId },
            { $set: { academics: { status: "REGISTERED", note } } },
            { new: true, upsert: true }
          );
          context = normalizeClearance(clearanceDoc);
        }
        break;

      case "clearExamBlock":
        if (userId) {
          const note = payload?.note || "Exam block cleared by staff";
          clearanceDoc = await Clearance.findOneAndUpdate(
            { userId },
            { $set: { examinations: { status: "CLEARED", note } } },
            { new: true, upsert: true }
          );
          context = normalizeClearance(clearanceDoc);
        }
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    // Emit update to service staff + dashboard
    const io = req.app?.get("io");
    if (io) {
      emitTicketToServiceAndDashboard(io, ticket, "ticketUpdatedByStaff", { action });
      await emitQueueUpdatedForService(io, ticket.serviceType);
    }

    res.json({ message: "Staff action executed", ticket, action, context });
  } catch (err) {
    console.error("Staff action error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a new ticket (student)
 */
exports.createTicket = async (req, res) => {
  try {
    const { serviceType, studentName, email, userId, isVIP } = req.body;
    if (!serviceType || !studentName || !email) {
      return res.status(400).json({ message: "serviceType, studentName and email are required" });
    }

    // ✅ Prevent duplicate active tickets for the same student
    if (userId) {
      const activeTicket = await Ticket.findOne({
        userId,
        status: { $in: ["waiting", "serving"] } // only active tickets
      });
      if (activeTicket) {
        return res.status(400).json({
          message: `You already have an active ticket (#${activeTicket.ticketNumber}) for ${activeTicket.serviceType}.`
        });
      }
    }

    const lastTicket = await Ticket.findOne({ serviceType }).sort({ ticketNumber: -1 });
    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    // Determine priority based on user attributes if userId provided
    let priority = "normal";
    let priorityScore = 0;
    let user = null;

    if (userId) {
      user = await User.findById(userId);
      if (user) {
        priority = determinePriorityLevel(user);
      }
    }

    if (isVIP) {
      priority = "vip";
    }

    // Create ticket without counter assignment first
    const ticket = await Ticket.create({
      ticketNumber: nextTicketNumber,
      serviceType,
      status: "waiting",
      studentName,
      email,
      userId: userId || null,
      priority,
      isVIP: Boolean(isVIP),
      priorityScore: calculatePriorityScore({ createdAt: new Date(), priority }, user),
    });

    // Use load balancing to find best counter for this ticket
    const bestCounter = await findBestCounterForTicket(serviceType, priority);
    
    let assignedCounter = null;
    if (bestCounter) {
      ticket.counterId = bestCounter.counterId;
      await ticket.save();
      assignedCounter = bestCounter;
    }

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketCreated(io, ticket);
      await emitQueueUpdatedForService(io, ticket.serviceType);
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    res.status(201).json({ 
      message: "Ticket created", 
      ticket,
      priority: priority,
      assignedCounter: assignedCounter,
      estimatedWaitTime: assignedCounter?.estimatedWaitTime || 0,
    });
  } catch (err) {
    console.error("Create ticket error:", err);
    if (err?.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= LATEST TICKET ================= */
exports.getLatestTicket = async (req, res) => {
  const { userId } = req.params;
  try {
    const ticket = await Ticket.findOne({ userId })
      .sort({ createdAt: -1 });

    res.json(ticket || null);
  } catch (err) {
    console.error("getLatestTicket error:", err);
    res.status(500).json({ message: "Failed to fetch latest ticket" });
  }
};


/**
 * Get next ticket for a service type (sorted by priority)
 */
exports.getNextTicket = async (req, res) => {
  try {
    const { serviceType } = req.params;

    // Get all blocked users
    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map(u => u._id);

    // Find the next ticket, excluding blocked users
    const ticket = await Ticket.findOne({
      serviceType,
      status: "waiting",
      userId: { $nin: blockedIds }, // exclude blocked users
    })
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name studentYear isVIP hasAccessibilityNeeds");

    if (!ticket) {
      return res.status(404).json({ message: "No waiting tickets" });
    }

    res.json(ticket);
  } catch (err) {
    console.error("Get next ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Get all tickets (for staff dashboard)
 */
/**
 * Get all tickets with optional filtering (by service type, status, priority)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const { serviceType, status, priority, userId, page = 1, limit = 50, format = "full" } = req.query;
    
    // Build filter query
    let query = {};

    // Filter by service type if provided
    if (serviceType) {
      query.serviceType = serviceType;
    }

    // Filter by status if provided (default is waiting if not specified)
    if (status && status !== "all") {
      query.status = status;
    } else if (!status) {
      query.status = { $in: ["waiting", "serving"] }; // Default to waiting and serving
    }

    // Filter by user if provided
    if (userId) {
      query.userId = userId;
    }

    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    }

    // Always exclude blocked students
    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map((u) => u._id.toString());
    if (query.userId) {
      if (blockedIds.includes(query.userId.toString())) {
        return res.json(format === "simple" ? [] : { message: "Tickets retrieved successfully", tickets: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }, filters: { serviceType: serviceType || "all", status: status || "waiting,serving", priority: priority || "all" } });
      }
      query.userId = query.userId;
    } else {
      query.userId = { $nin: blockedIds };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Ticket.countDocuments(query);

    // Fetch tickets with pagination, sort by priority score and creation time
    const tickets = await Ticket.find(query)
      .sort({ priorityScore: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate("userId", "name email studentYear isVIP hasAccessibilityNeeds")
      .populate("counterId", "counterName status");

    // Backward compatible: return simple array if no filters and format=simple
    if (!serviceType && !status && !priority && format === "simple") {
      return res.json(sortByPriority(tickets));
    }

    // Full response with pagination and filters
    res.json({
      message: "Tickets retrieved successfully",
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: {
        serviceType: serviceType || "all",
        status: status || "waiting,serving",
        priority: priority || "all",
      },
    });
  } catch (err) {
    console.error("Get all tickets error:", err);
    res.status(500).json({ message: "Failed to load tickets" });
  }
};

/**
 * Get waiting tickets with optional service type filter (sorted by priority)
 */
exports.getWaitingTickets = async (req, res) => {
  try {
    const { serviceType } = req.query;
    let query = { status: "waiting" };

    // Filter by serviceType if provided
    if (serviceType) {
      query.serviceType = serviceType;
    }

    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map((u) => u._id);
    query.userId = { $nin: blockedIds };

    const tickets = await Ticket.find(query)
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name email studentYear isVIP hasAccessibilityNeeds");

    res.json(sortByPriority(tickets));
  } catch (err) {
    console.error("Get waiting tickets error:", err);
    res.status(500).json({ message: "Failed to load waiting tickets" });
  }
};

/**
 * Get queue position for a specific ticket (student-safe)
 */
exports.getQueuePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "waiting") {
      return res.status(200).json({
        message: "Ticket is not in waiting queue",
        status: ticket.status,
        position: null,
        peopleAhead: null,
        totalWaiting: 0,
        estimatedWait: 0,
      });
    }

    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map((u) => u._id);

    const waiting = await Ticket.find({
      status: "waiting",
      serviceType: ticket.serviceType,
      userId: { $nin: blockedIds },
    }).sort({ priorityScore: -1, createdAt: 1 });

    const index = waiting.findIndex((t) => String(t._id) === String(ticket._id));
    const position = index >= 0 ? index + 1 : null;
    const peopleAhead = position ? Math.max(position - 1, 0) : null;
    const estimatedWait = peopleAhead != null ? peopleAhead * 5 : 0;

    res.json({
      message: "Queue position resolved",
      serviceType: ticket.serviceType,
      ticketNumber: ticket.ticketNumber,
      position,
      peopleAhead,
      totalWaiting: waiting.length,
      estimatedWait,
    });
  } catch (err) {
    console.error("Get queue position error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Queue overview (centralized, per service)
 */
exports.getQueueOverview = async (req, res) => {
  try {
    const blockedUsers = await User.find({ blocked: true }).select("_id");
    const blockedIds = blockedUsers.map((u) => u._id);

    const waitingByService = await Ticket.aggregate([
      {
        $match: {
          status: "waiting",
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: { $nin: blockedIds } },
          ],
        },
      },
      {
        $group: {
          _id: "$serviceType",
          waiting: { $sum: 1 },
        },
      },
    ]);

    const counterStats = await Counter.aggregate([
      {
        $group: {
          _id: "$serviceType",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          busy: { $sum: { $cond: [{ $eq: ["$status", "busy"] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        },
      },
    ]);

    const waitingMap = waitingByService.reduce((acc, item) => {
      acc[item._id] = item.waiting;
      return acc;
    }, {});

    const counterMap = counterStats.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});

    const serviceTypes = [
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

    const services = serviceTypes.map((serviceType) => {
      const waiting = waitingMap[serviceType] || 0;
      const counters = counterMap[serviceType] || { total: 0, open: 0, busy: 0, closed: 0 };
      const estimatedWaitMins = Math.max(0, waiting) * 5;
      return {
        serviceType,
        waiting,
        estimatedWaitMins,
        counters: {
          total: counters.total || 0,
          open: counters.open || 0,
          busy: counters.busy || 0,
          closed: counters.closed || 0,
        },
        // Treat services with an active waiting queue as open for the customer overview.
        status: (counters.open || 0) > 0 || waiting > 0 ? "open" : "closed",
      };
    });

    res.json({
      message: "Queue overview",
      services,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Queue overview error:", err);
    res.status(500).json({ message: "Failed to load queue overview" });
  }
};

/**
 * Get ticket by ID
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id)
      .populate("userId", "name email")
      .populate("counterId", "counterName status");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const userId = ticket.userId?._id?.toString() || ticket.userId?.toString();
    const clearanceDoc = userId ? await Clearance.findOne({ userId }) : null;
    const context = normalizeClearance(clearanceDoc);
    res.json({
      ticket,
      context,
    });

  } catch (err) {
    console.error("Get ticket by ID error:", err);
    res.status(500).json({ message: "Failed to load ticket" });
  }
};

/**
 * Serve ticket (staff takes ownership)
 */
exports.serveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { counterId } = req.body;

    // 1) Fetch ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (!["waiting", "on_hold"].includes(ticket.status)) {
      return res.status(400).json({
        message: `Cannot serve ticket with status ${ticket.status}`,
      });
    }

    // 2) Fetch counter if provided
    let counter = null;
    let oldCounterStatus = null;
    if (counterId) {
      counter = await Counter.findById(counterId);
      if (!counter) {
        return res.status(404).json({ message: "Counter not found" });
      }

      if (counter.status !== "open") {
        return res.status(400).json({
          message: "Counter is currently busy",
        });
      }

      oldCounterStatus = counter.status;
    }

    // 3) Assign ownership
    ticket.status = "serving";
    ticket.servedAt = new Date();
    ticket.serviceStartTime = ticket.servedAt;
    ticket.servedBy = req.user?.id || null;
    if (counter) {
      ticket.counterId = counter._id;
      counter.status = "busy";
      counter.currentTicket = ticket._id;
    }

    await ticket.save();
    if (counter) await counter.save();

    // 4) Emit socket events
    const io = req.app?.get("io");
    if (io) {
      emitTicketServing(io, ticket, counter?.counterName || "Unassigned");

      if (counter) {
        emitCounterUpdateToStaff(io, counter, "counterStatusUpdated", {
          reason: "Started serving ticket",
          currentTicket: ticket._id,
        });

        emitCounterUpdateToStaff(io, counter, "counterStatusChanged", {
          oldStatus: oldCounterStatus,
          newStatus: counter.status,
        });

        emitTicketToCounterStaff(io, ticket, counter._id, "ticketServing", {
          counterName: counter.counterName,
          message: `You are now serving ticket #${ticket.ticketNumber}`,
        });

        emitTicketToServiceAndDashboard(io, ticket, "ticketServing", {
          counterName: counter.counterName,
        });
      } else {
        emitTicketToServiceAndDashboard(io, ticket, "ticketServing", {
          counterName: "Unassigned",
        });
      }

      if (ticket.userId) {
        emitToUserOnly(io, ticket.userId, "ticketServing", {
          ticketNumber: ticket.ticketNumber,
          message: "Your ticket is now being served",
        });
      }
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    res.json({
      message: "Ticket is now being served",
      ticket,
    });
  } catch (err) {
    console.error("Serve ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Complete ticket
 */
exports.completeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate("counterId", "counterName status");
    
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "serving") {
      return res.status(400).json({ message: "Only serving tickets can be completed" });
    }

    const counterName = ticket.counterId?.counterName;

    ticket.status = "completed";
    ticket.completedAt = new Date();
    ticket.serviceEndTime = ticket.completedAt;
    if (!ticket.serviceStartTime && ticket.servedAt) ticket.serviceStartTime = ticket.servedAt;
    await ticket.save();

    // Update counter to open and remove current ticket
    let updatedCounter = null;
    if (ticket.counterId) {
      updatedCounter = await Counter.findByIdAndUpdate(ticket.counterId, { 
        status: "open", 
        currentTicket: null 
      }, { new: true });

      // Update counter metrics with ticket service time
      await updateCounterMetricsOnCompletion(ticket.counterId, ticket);
    }

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketCompleted(io, ticket, counterName);
      if (updatedCounter) {
        emitCounterStatusUpdated(io, updatedCounter);
        emitCounterStatusChanged(io, updatedCounter, "busy", "Ticket completed");
        emitCounterMetricsUpdated(io, updatedCounter);
      }
      await emitQueueUpdatedForService(io, ticket.serviceType);
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    res.json({ message: "Ticket completed", ticket });
  } catch (err) {
    console.error("Complete ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Put ticket on hold and release counter
 */
exports.holdTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate("counterId", "counterName status");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "serving") {
      return res.status(400).json({ message: "Only serving tickets can be put on hold" });
    }

    ticket.status = "on_hold";
    await ticket.save();

    let updatedCounter = null;
    if (ticket.counterId) {
      updatedCounter = await Counter.findByIdAndUpdate(
        ticket.counterId,
        { status: "open", currentTicket: null },
        { new: true }
      );
    }

    const io = req.app?.get("io");
    if (io) {
      emitTicketToServiceAndDashboard(io, ticket, "ticketOnHold", {
        message: `Ticket #${ticket.ticketNumber} placed on hold`,
      });
      if (updatedCounter) {
        emitCounterStatusUpdated(io, updatedCounter);
        emitCounterStatusChanged(io, updatedCounter, "busy", "Ticket put on hold");
      }
      await emitQueueUpdatedForService(io, ticket.serviceType);
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    res.json({ message: "Ticket put on hold", ticket });
  } catch (err) {
    console.error("Hold ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Check-in confirmation for virtual queue (near-turn flow)
 */
exports.checkInTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const isOwner = ticket.userId && req.user?._id && String(ticket.userId) === String(req.user._id);
    const isStaff = ["staff", "admin"].includes(req.user?.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Forbidden: you can only check in your own ticket" });
    }

    if (ticket.status !== "waiting") {
      return res.status(400).json({ message: `Cannot check in ticket with status ${ticket.status}` });
    }

    if (!ticket.checkInRequired) {
      return res.status(400).json({ message: "Check-in not required for this ticket yet" });
    }

    ticket.checkedInAt = new Date();
    ticket.checkInRequired = false;
    await ticket.save();

    return res.json({ message: "Checked in successfully", ticket });
  } catch (err) {
    console.error("Check-in ticket error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel ticket
 */
exports.cancelTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate("counterId", "counterName status");
    
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Cannot cancel already completed or cancelled tickets
    if (ticket.status === "completed" || ticket.status === "cancelled") {
      return res.status(400).json({ message: `Cannot cancel a ${ticket.status} ticket` });
    }

    // Track if ticket was being served to update counter
    const wasServing = ticket.status === "serving";
    
    ticket.status = "cancelled";
    ticket.cancelledAt = new Date();
    await ticket.save();

    // Update counter if ticket was being served
    if (ticket.counterId && wasServing) {
      await Counter.findByIdAndUpdate(ticket.counterId, { 
        status: "open", 
        currentTicket: null 
      });
    }

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketCancelled(io, ticket);
      await emitQueueUpdatedForService(io, ticket.serviceType);
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    res.json({ message: "Ticket cancelled successfully", ticket });
  } catch (err) {
    console.error("Cancel ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Smart Transfer: close current ticket + create new ticket in target department
 */
exports.transferTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceType: targetService, reason } = req.body;

    if (!targetService) {
      return res.status(400).json({ message: "target serviceType is required" });
    }

    // 1️⃣ Fetch current ticket
    const oldTicket = await Ticket.findById(id);
    if (!oldTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (!["serving", "waiting"].includes(oldTicket.status)) {
      return res.status(400).json({
        message: `Cannot transfer ticket with status ${oldTicket.status}`,
      });
    }

    // 2️⃣ Mark old ticket as transferred
    oldTicket.status = "transferred";
    oldTicket.transferredAt = new Date();
    await oldTicket.save();

     // 🔓 Free counter if ticket was being served
if (oldTicket.counterId) {
  await Counter.findByIdAndUpdate(oldTicket.counterId, {
    status: "open",
    currentTicket: null,
  });
}


    // 3️⃣ Generate next ticket number for target service
    const lastTicket = await Ticket.findOne({ serviceType: targetService })
      .sort({ ticketNumber: -1 });

    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    // 4️⃣ Create new ticket in target department
    const newTicket = await Ticket.create({
      ticketNumber: nextTicketNumber,
      serviceType: targetService,
      status: "waiting",
      studentName: oldTicket.studentName,
      email: oldTicket.email,
      userId: oldTicket.userId || null,
      priority: oldTicket.priority,
      priorityScore: oldTicket.priorityScore,
      parentTicketId: oldTicket._id,
    });

    // 5️⃣ Link child ticket to parent
    oldTicket.childTicketIds.push(newTicket._id);
    await oldTicket.save();

    // 6️⃣ Socket events
    const io = req.app?.get("io");
    if (io) {
      emitTicketTransferred(io, {
        fromTicket: oldTicket,
        toTicket: newTicket,
        reason: reason || "Transferred by staff",
      });

      await emitQueueUpdatedForService(io, oldTicket.serviceType);
      await emitQueueUpdatedForService(io, newTicket.serviceType);
      await notifyNearTurnForService(io, oldTicket.serviceType);
      await notifyNearTurnForService(io, newTicket.serviceType);
    }

    res.json({
      message: "Ticket transferred successfully",
      oldTicket,
      newTicket,
    });
  } catch (err) {
    console.error("Smart transfer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Update ticket priority
 */
exports.updateTicketPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, reason } = req.body;

    if (!priority) {
      return res.status(400).json({ message: "priority is required" });
    }

    const validPriorities = ["normal", "high", "urgent", "vip"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ 
        message: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` 
      });
    }

    const ticket = await Ticket.findById(id).populate("userId");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const oldPriority = ticket.priority;
    const oldScore = ticket.priorityScore;
    ticket.priority = priority;
    ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
    await ticket.save();

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitTicketPriorityUpdated(io, ticket, oldPriority);
      await emitQueueUpdatedForService(io, ticket.serviceType);
    }

    res.json({
      message: "Ticket priority updated",
      ticket,
      change: {
        from: oldPriority,
        to: priority,
        reason: reason || "Updated by staff",
        oldScore,
        newScore: ticket.priorityScore,
      },
    });
  } catch (err) {
    console.error("Update ticket priority error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Mark ticket as VIP
 */
exports.markAsVIP = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id).populate("userId");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // If ticket has a user, update user's VIP status
    if (ticket.userId) {
      await User.findByIdAndUpdate(ticket.userId, { isVIP: true });
    }

    const oldPriority = ticket.priority;
    ticket.priority = "vip";
    ticket.isVIP = true;
    ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
    await ticket.save();

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketPriorityUpdated(io, ticket, oldPriority);
      await emitQueueUpdatedForService(io, ticket.serviceType);
    }

    res.json({
      message: "Ticket marked as VIP",
      ticket,
      details: {
        reason: reason || "Marked as VIP by staff",
        newPriority: "vip",
      },
    });
  } catch (err) {
    console.error("Mark as VIP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Mark ticket as requiring accessibility accommodation
 */
exports.markAccessibilityNeeds = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id).populate("userId");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // If ticket has a user, update accessibility needs
    if (ticket.userId) {
      await User.findByIdAndUpdate(ticket.userId, { hasAccessibilityNeeds: true });
    }

    // Set priority to high for accessibility needs
    const oldPriority = ticket.priority;
    ticket.priority = "high";
    ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
    await ticket.save();

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketPriorityUpdated(io, ticket, oldPriority);
      await emitQueueUpdatedForService(io, ticket.serviceType);
    }

    res.json({
      message: "Ticket marked with accessibility needs",
      ticket,
      details: {
        reason: reason || "Accessibility accommodation needed",
        oldPriority,
        newPriority: "high",
      },
    });
  } catch (err) {
    console.error("Mark accessibility needs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get priority queue summary (tickets grouped by priority)
 */
exports.getPriorityQueueSummary = async (req, res) => {
  try {
    const { serviceType } = req.query;
    let query = { status: "waiting" };

    if (serviceType) {
      query.serviceType = serviceType;
    }

    // Get all waiting tickets sorted by priority
    const tickets = await Ticket.find(query)
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name studentYear isVIP hasAccessibilityNeeds");

    // Group by priority
    const grouped = {
      vip: [],
      urgent: [],
      high: [],
      normal: [],
    };

    tickets.forEach((ticket) => {
      grouped[ticket.priority]?.push(ticket);
    });

    res.json({
      message: "Priority queue summary",
      summary: {
        totalWaiting: tickets.length,
        vipCount: grouped.vip.length,
        urgentCount: grouped.urgent.length,
        highCount: grouped.high.length,
        normalCount: grouped.normal.length,
      },
      grouped,
      topTicket: tickets[0] || null,
    });
  } catch (err) {
    console.error("Get priority queue summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
