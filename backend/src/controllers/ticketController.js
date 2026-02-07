// backend/src/controllers/ticketController.js
const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");
const User = require("../models/User");
const { calculatePriorityScore, determinePriorityLevel, sortByPriority } = require("../utils/priorityHelper");
const { findBestCounterForTicket } = require("../utils/loadBalancer");
const { updateCounterMetricsOnCompletion } = require("../utils/metricsCalculator");
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

    switch (action) {
      case "markVIP":
        ticket.priority = "vip";
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
        await ticket.save();
        if (ticket.counterId) await updateCounterMetricsOnCompletion(ticket.counterId, ticket);
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    // Emit update to service staff + dashboard
    const io = req.app?.get("io");
    if (io) {
      emitTicketToServiceAndDashboard(io, ticket, "ticketUpdatedByStaff", { action });
      emitQueueUpdated(io, ticket.serviceType);
    }

    res.json({ message: "Staff action executed", ticket, action });
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
    const { serviceType, studentName, email, userId } = req.body;
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

    // Create ticket without counter assignment first
    const ticket = await Ticket.create({
      ticketNumber: nextTicketNumber,
      serviceType,
      status: "waiting",
      studentName,
      email,
      userId: userId || null,
      priority,
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
      emitQueueUpdated(io, ticket.serviceType);
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
    const { serviceType, status, priority, page = 1, limit = 50, format = "full" } = req.query;
    
    // Build filter query
    let query = {};

    // Filter by service type if provided
    if (serviceType) {
      query.serviceType = serviceType;
    }

    // Filter by status if provided (default is waiting if not specified)
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ["waiting", "serving"] }; // Default to waiting and serving
    }

    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    
   // ✅ Always exclude blocked students
const blockedUsers = await User.find({ blocked: true }).select("_id");
const blockedIds = blockedUsers.map(u => u._id);
query.userId = query.userId
  ? { ...query.userId, $nin: blockedIds }  // merge with existing userId filter if any
  : { $nin: blockedIds };


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
      return res.json(tickets);
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

      
// ✅ Always exclude blocked students
const blockedUsers = await User.find({ blocked: true }).select("_id");
const blockedIds = blockedUsers.map(u => u._id);
query.userId = { $nin: blockedIds };

    }

    const tickets = await Ticket.find(query)
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name email studentYear isVIP hasAccessibilityNeeds");

    res.json(tickets);
  } catch (err) {
    console.error("Get waiting tickets error:", err);
    res.status(500).json({ message: "Failed to load waiting tickets" });
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

    res.json({
  ticket,
  context: {
    finance: {
      status: "",
      note: "",
    },
    academics: {
      status: "",
      note: "",
    },
    examinations: {
      status: "",
      note: "",
    },
  },
});

  } catch (err) {
    console.error("Get ticket by ID error:", err);
    res.status(500).json({ message: "Failed to load ticket" });
  }
};

/**
 * Serve ticket
 */
exports.serveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { counterId } = req.body;
    if (!counterId) return res.status(400).json({ message: "counterId required" });

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.status !== "waiting") return res.status(400).json({ message: "Invalid ticket" });

    const counter = await Counter.findById(counterId);
    if (!counter) return res.status(404).json({ message: "Counter not found" });

    const oldCounterStatus = counter.status;
    ticket.status = "serving";
    ticket.servedAt = new Date();
    ticket.servedBy = req.user?.id || null;
    ticket.counterId = counter._id;
    counter.status = "busy";
    counter.currentTicket = ticket._id;

    await ticket.save();
    await counter.save();

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      // Broadcast to all clients
      emitTicketServing(io, ticket, counter.counterName);
      
      // Counter staff only sees their counter updates
      emitCounterUpdateToStaff(io, counter, "counterStatusUpdated", {
        reason: "Started serving ticket",
        currentTicket: ticket._id,
      });
      emitCounterUpdateToStaff(io, counter, "counterStatusChanged", {
        oldStatus: oldCounterStatus,
        newStatus: counter.status,
      });
      
      // Counter staff sees their assigned ticket
      emitTicketToCounterStaff(io, ticket, counter._id, "ticketServing", {
        counterName: counter.counterName,
        message: `You are now serving ticket #${ticket.ticketNumber}`,
      });
      
      // Service staff + dashboard see the update
      emitTicketToServiceAndDashboard(io, ticket, "ticketServing", {
        counterName: counter.counterName,
      });
      
      // User sees their ticket is being served
      if (ticket.userId) {
        emitToUserOnly(io, ticket.userId, "ticketServing", {
          ticketNumber: ticket.ticketNumber,
          message: `Your ticket is being served at counter ${counter.counterName}`,
        });
      }
    }

    res.json({ message: "Ticket is now being served", ticket });
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
      emitQueueUpdated(io, ticket.serviceType);
    }

    res.json({ message: "Ticket completed", ticket });
  } catch (err) {
    console.error("Complete ticket error:", err);
    res.status(500).json({ message: "Server error" });
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
      emitQueueUpdated(io, ticket.serviceType);
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

      emitQueueUpdated(io, oldTicket.serviceType);
      emitQueueUpdated(io, newTicket.serviceType);
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
      emitQueueUpdated(io, ticket.serviceType);
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
    ticket.priorityScore = calculatePriorityScore(ticket, ticket.userId);
    await ticket.save();

    // Emit Socket.IO events
    const io = req.app?.get("io");
    if (io) {
      emitTicketPriorityUpdated(io, ticket, oldPriority);
      emitQueueUpdated(io, ticket.serviceType);
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
      emitQueueUpdated(io, ticket.serviceType);
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
