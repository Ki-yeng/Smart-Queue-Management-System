const Counter = require("../models/Counter");
const User = require("../models/User");
const { emitCounterStatusUpdated } = require("../utils/socketEvents");
const {
  getCountersByLoad,
  findBestCounterForTicket,
  getLoadBalancingDashboard,
  suggestLoadRebalancing,
} = require("../utils/loadBalancer");
const {
  getCounterMetrics,
  getAllCounterMetrics,
  getCounterComparison,
  getMetricsSummary,
} = require("../utils/metricsCalculator");

/**
 * CREATE COUNTER
 * POST /api/counters
 */
exports.createCounter = async (req, res) => {
  try {
    const { name, serviceType } = req.body;

    if (!name || !serviceType) {
      return res
        .status(400)
        .json({ message: "name and serviceType are required" });
    }

    const counter = await Counter.create({ name, serviceType });

    res.status(201).json({
      message: "Counter created successfully",
      counter,
    });
  } catch (error) {
    console.error("Create counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * OPEN COUNTER
 * PUT /api/counters/open/:id
 */
exports.openCounter = async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      { status: "open" },
      { new: true }
    );

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      message: "Counter opened",
      counter,
    });
  } catch (error) {
    console.error("Open counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CLOSE COUNTER
 * PUT /api/counters/close/:id
 */
exports.closeCounter = async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      {
        status: "closed",
        currentTicket: null,
      },
      { new: true }
    );

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      message: "Counter closed",
      counter,
    });
  } catch (error) {
    console.error("Close counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL COUNTERS + CURRENT TICKET
 * GET /api/counters
 */
exports.getAllCounters = async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate("currentTicket")
      .populate("assignedStaff", "name email department")
      .populate("assignmentHistory.staffId", "name email");

    res.json(counters);
  } catch (error) {
    console.error("Get counters error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Assign staff member to a counter
 * PUT /api/counters/:id/assign-staff
 */
exports.assignStaffToCounter = async (req, res) => {
  try {
    const { counterId } = req.params;
    const { staffId, reason } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: "staffId is required" });
    }

    // Verify counter exists
    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    // Verify staff member exists and is staff role
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (staff.role !== "staff" && staff.role !== "admin") {
      return res.status(400).json({ message: "User is not a staff member" });
    }

    // If counter already has assigned staff, add to history
    if (counter.assignedStaff) {
      const previousStaff = await User.findById(counter.assignedStaff);
      counter.assignmentHistory.push({
        staffId: counter.assignedStaff,
        staffName: previousStaff?.name || "Unknown",
        assignedAt: counter.updatedAt,
        unassignedAt: new Date(),
        reason: "Reassigned to different staff member",
      });
    }

    // Assign new staff
    counter.assignedStaff = staffId;
    await counter.save();

    // Fetch updated counter with populated data
    const updatedCounter = await Counter.findById(counterId)
      .populate("currentTicket")
      .populate("assignedStaff", "name email department");

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitCounterStatusUpdated(io, updatedCounter);
    }

    res.json({
      message: `Staff member ${staff.name} assigned to ${counter.counterName}`,
      counter: updatedCounter,
      assignment: {
        staffName: staff.name,
        staffEmail: staff.email,
        counterName: counter.counterName,
        reason: reason || "Staff assignment",
      },
    });
  } catch (error) {
    console.error("Assign staff error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Unassign staff member from counter
 * PUT /api/counters/:id/unassign-staff
 */
exports.unassignStaffFromCounter = async (req, res) => {
  try {
    const { counterId } = req.params;
    const { reason } = req.body;

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    if (!counter.assignedStaff) {
      return res.status(400).json({ message: "No staff member assigned to this counter" });
    }

    // Get staff details before unassigning
    const staff = await User.findById(counter.assignedStaff);

    // Add to assignment history
    counter.assignmentHistory.push({
      staffId: counter.assignedStaff,
      staffName: staff?.name || "Unknown",
      assignedAt: counter.updatedAt,
      unassignedAt: new Date(),
      reason: reason || "Staff unassigned",
    });

    // Unassign staff
    counter.assignedStaff = null;
    await counter.save();

    // Fetch updated counter
    const updatedCounter = await Counter.findById(counterId)
      .populate("currentTicket")
      .populate("assignedStaff");

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitCounterStatusUpdated(io, updatedCounter);
    }

    res.json({
      message: `Staff member ${staff?.name || "Unknown"} unassigned from ${counter.counterName}`,
      counter: updatedCounter,
      unassignment: {
        staffName: staff?.name,
        counterName: counter.counterName,
        reason: reason || "Staff unassigned",
        unassignedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Unassign staff error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get counter assignment history
 * GET /api/counters/:id/assignment-history
 */
exports.getAssignmentHistory = async (req, res) => {
  try {
    const { counterId } = req.params;

    const counter = await Counter.findById(counterId)
      .populate("assignedStaff", "name email")
      .populate("assignmentHistory.staffId", "name email department");

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      counter: counter.counterName,
      currentStaff: counter.assignedStaff,
      assignmentHistory: counter.assignmentHistory,
      totalAssignments: counter.assignmentHistory.length,
    });
  } catch (error) {
    console.error("Get assignment history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all counters with staff assignments
 * GET /api/counters/staff/assignments
 */
exports.getCounterStaffAssignments = async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate("assignedStaff", "name email department")
      .populate("currentTicket", "ticketNumber priority")
      .sort({ counterName: 1 });

    const assignments = counters.map((counter) => ({
      counterId: counter._id,
      counterName: counter.counterName,
      serviceTypes: counter.serviceTypes,
      status: counter.status,
      assignedStaff: counter.assignedStaff ? {
        id: counter.assignedStaff._id,
        name: counter.assignedStaff.name,
        email: counter.assignedStaff.email,
        department: counter.assignedStaff.department,
      } : null,
      currentTicket: counter.currentTicket,
    }));

    res.json({
      message: "Counter staff assignments",
      total: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get counter staff assignments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get counters by staff member
 * GET /api/counters/by-staff/:staffId
 */
exports.getCountersByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Verify staff member exists
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const counters = await Counter.find({ assignedStaff: staffId })
      .populate("currentTicket", "ticketNumber priority status");

    res.json({
      message: `Counters assigned to ${staff.name}`,
      staffId,
      staffName: staff.name,
      assignedCounters: counters,
      totalCounters: counters.length,
    });
  } catch (error) {
    console.error("Get counters by staff error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update counter availability status
 * PUT /api/counters/:id/availability
 */
exports.updateAvailabilityStatus = async (req, res) => {
  try {
    const { counterId } = req.params;
    const { availabilityStatus, reason, estimatedReturnTime } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({ message: "availabilityStatus is required" });
    }

    const validStatuses = ["available", "unavailable", "maintenance", "on_break"];
    if (!validStatuses.includes(availabilityStatus)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    // Add to availability history
    counter.availabilityHistory.push({
      status: counter.availabilityStatus,
      changedAt: new Date(),
      changedUntil: new Date(),
      reason: `Changed from ${counter.availabilityStatus} to ${availabilityStatus}`,
      changedBy: req.user?._id,
    });

    // Update availability status
    counter.availabilityStatus = availabilityStatus;
    counter.lastAvailabilityChange = new Date();
    counter.unavailabilityReason = reason || null;
    counter.estimatedReturnTime = estimatedReturnTime || null;

    await counter.save();

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitCounterStatusUpdated(io, counter);
    }

    res.json({
      message: `Counter availability updated to ${availabilityStatus}`,
      counter,
      change: {
        from: counter.availabilityStatus,
        to: availabilityStatus,
        reason,
        changedAt: counter.lastAvailabilityChange,
      },
    });
  } catch (error) {
    console.error("Update availability status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get counter availability status
 * GET /api/counters/:id/availability
 */
exports.getAvailabilityStatus = async (req, res) => {
  try {
    const { counterId } = req.params;

    const counter = await Counter.findById(counterId)
      .populate("availabilityHistory.changedBy", "name email");

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      counterId: counter._id,
      counterName: counter.counterName,
      currentAvailability: {
        status: counter.availabilityStatus,
        lastChange: counter.lastAvailabilityChange,
        reason: counter.unavailabilityReason,
        estimatedReturn: counter.estimatedReturnTime,
      },
      availabilityHistory: counter.availabilityHistory,
      performanceMetrics: counter.performanceMetrics,
    });
  } catch (error) {
    console.error("Get availability status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all available counters (filtered by service type)
 * GET /api/counters/available
 */
exports.getAvailableCounters = async (req, res) => {
  try {
    const { serviceType } = req.query;

    let query = {
      availabilityStatus: "available",
      status: { $ne: "closed" },
    };

    if (serviceType) {
      query.serviceTypes = serviceType;
    }

    const counters = await Counter.find(query)
      .populate("assignedStaff", "name email")
      .populate("currentTicket", "ticketNumber priority")
      .sort({ counterName: 1 });

    const availabilityData = counters.map((counter) => ({
      counterId: counter._id,
      counterName: counter.counterName,
      serviceTypes: counter.serviceTypes,
      status: counter.status,
      availabilityStatus: counter.availabilityStatus,
      assignedStaff: counter.assignedStaff,
      currentTicket: counter.currentTicket,
      lastAvailabilityChange: counter.lastAvailabilityChange,
    }));

    res.json({
      message: `${availabilityData.length} available counters`,
      total: availabilityData.length,
      serviceType: serviceType || "all",
      counters: availabilityData,
    });
  } catch (error) {
    console.error("Get available counters error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Set counter for maintenance
 * PUT /api/counters/:id/maintenance
 */
exports.setCounterMaintenance = async (req, res) => {
  try {
    const { counterId } = req.params;
    const { reason, estimatedReturnTime } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Maintenance reason is required" });
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    // Record previous status in history
    counter.availabilityHistory.push({
      status: counter.availabilityStatus,
      changedAt: new Date(),
      reason: `Maintenance: ${reason}`,
      changedBy: req.user?._id,
    });

    // Set to maintenance
    counter.availabilityStatus = "maintenance";
    counter.lastAvailabilityChange = new Date();
    counter.unavailabilityReason = reason;
    counter.estimatedReturnTime = estimatedReturnTime || null;
    counter.performanceMetrics.lastMaintenanceDate = new Date();

    // Mark as closed while in maintenance
    if (counter.status !== "closed") {
      counter.status = "closed";
    }

    await counter.save();

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitCounterStatusUpdated(io, counter);
    }

    res.json({
      message: `Counter set for maintenance: ${reason}`,
      counter,
      maintenanceInfo: {
        reason,
        startedAt: counter.lastAvailabilityChange,
        estimatedReturn: estimatedReturnTime,
      },
    });
  } catch (error) {
    console.error("Set maintenance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Resume counter from maintenance/break
 * PUT /api/counters/:id/resume
 */
exports.resumeCounter = async (req, res) => {
  try {
    const { counterId } = req.params;
    const { reason } = req.body;

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    // Record in history
    counter.availabilityHistory.push({
      status: counter.availabilityStatus,
      changedAt: counter.lastAvailabilityChange,
      changedUntil: new Date(),
      reason: reason || `Resumed from ${counter.availabilityStatus}`,
      changedBy: req.user?._id,
    });

    // Resume to available
    counter.availabilityStatus = "available";
    counter.lastAvailabilityChange = new Date();
    counter.unavailabilityReason = null;
    counter.estimatedReturnTime = null;
    counter.status = "open";

    await counter.save();

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      emitCounterStatusUpdated(io, counter);
    }

    res.json({
      message: `Counter ${counter.counterName} resumed and available`,
      counter,
      resumeInfo: {
        reason: reason || "Resumed",
        resumedAt: counter.lastAvailabilityChange,
      },
    });
  } catch (error) {
    console.error("Resume counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get availability statistics
 * GET /api/counters/stats/availability
 */
exports.getAvailabilityStats = async (req, res) => {
  try {
    const counters = await Counter.find();

    const stats = {
      totalCounters: counters.length,
      availableCounters: counters.filter((c) => c.availabilityStatus === "available").length,
      unavailableCounters: counters.filter((c) => c.availabilityStatus === "unavailable").length,
      maintenanceCounters: counters.filter((c) => c.availabilityStatus === "maintenance").length,
      onBreakCounters: counters.filter((c) => c.availabilityStatus === "on_break").length,
      averageUptimePercentage: (
        counters.reduce((sum, c) => sum + (c.performanceMetrics?.uptimePercentage || 0), 0) /
        counters.length
      ).toFixed(2),
      byServiceType: {},
    };

    // Group by service type
    counters.forEach((counter) => {
      counter.serviceTypes?.forEach((service) => {
        if (!stats.byServiceType[service]) {
          stats.byServiceType[service] = {
            total: 0,
            available: 0,
            unavailable: 0,
            maintenance: 0,
            onBreak: 0,
          };
        }
        stats.byServiceType[service].total++;
        if (counter.availabilityStatus === "available") {
          stats.byServiceType[service].available++;
        } else if (counter.availabilityStatus === "unavailable") {
          stats.byServiceType[service].unavailable++;
        } else if (counter.availabilityStatus === "maintenance") {
          stats.byServiceType[service].maintenance++;
        } else if (counter.availabilityStatus === "on_break") {
          stats.byServiceType[service].onBreak++;
        }
      });
    });

    res.json({
      message: "Counter availability statistics",
      timestamp: new Date(),
      stats,
    });
  } catch (error) {
    console.error("Get availability stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET LOAD BALANCING DASHBOARD
 * GET /api/counters/load-balancing/dashboard
 * Returns real-time load metrics for all counters
 */
exports.getLoadBalancingDashboard = async (req, res) => {
  try {
    const dashboard = await getLoadBalancingDashboard();
    
    if (!dashboard) {
      return res.status(500).json({ message: "Failed to calculate load metrics" });
    }

    res.json({
      message: "Load balancing dashboard",
      data: dashboard,
    });
  } catch (error) {
    console.error("Get load balancing dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET COUNTERS BY LOAD
 * GET /api/counters/load-balancing/by-load
 * Returns all counters sorted by current load (lowest first)
 */
exports.getCountersByLoad = async (req, res) => {
  try {
    const { serviceType } = req.query;
    
    const counters = await getCountersByLoad(serviceType);

    res.json({
      message: "Counters sorted by load",
      serviceType: serviceType || "all",
      count: counters.length,
      counters,
    });
  } catch (error) {
    console.error("Get counters by load error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET BEST COUNTER FOR TICKET
 * GET /api/counters/load-balancing/best-counter
 * Recommends the best counter for a new ticket based on load balancing
 */
exports.getBestCounterForTicket = async (req, res) => {
  try {
    const { serviceType, priority } = req.query;

    if (!serviceType) {
      return res.status(400).json({ message: "serviceType query parameter is required" });
    }

    const bestCounter = await findBestCounterForTicket(serviceType, priority || "normal");

    if (!bestCounter) {
      return res.status(404).json({ 
        message: "No available counters for the requested service type",
        serviceType,
      });
    }

    res.json({
      message: "Best counter recommended",
      recommendation: bestCounter,
      reason: `Counter has ${bestCounter.totalQueueLength} customer(s) in queue with estimated wait time of ${bestCounter.estimatedWaitTime} minutes`,
    });
  } catch (error) {
    console.error("Get best counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET LOAD REBALANCING SUGGESTIONS
 * GET /api/counters/load-balancing/suggestions
 * Returns recommendations for redistributing tickets to balance load
 */
exports.getLoadRebalancingSuggestions = async (req, res) => {
  try {
    const { threshold } = req.query;
    const loadThreshold = threshold ? parseInt(threshold) : 70;

    const suggestions = await suggestLoadRebalancing(loadThreshold);

    res.json({
      message: "Load rebalancing suggestions",
      loadThreshold,
      suggestionCount: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("Get load rebalancing suggestions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL COUNTERS WITH CURRENT STATUS
 * GET /api/counters/status/all
 * Returns all counters with comprehensive status information
 */
exports.getAllCountersWithStatus = async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate("currentTicket", "ticketNumber priority serviceType status")
      .populate("assignedStaff", "name email department role")
      .lean();

    // Enhance counter data with additional status information
    const countersWithStatus = await Promise.all(
      counters.map(async (counter) => {
        // Count waiting tickets for this counter
        const Ticket = require("../models/Ticket");
        const waitingCount = await Ticket.countDocuments({
          counterId: counter._id,
          status: "waiting",
        });

        const servingCount = counter.currentTicket ? 1 : 0;
        const totalQueueLength = waitingCount + servingCount;

        return {
          _id: counter._id,
          counterName: counter.counterName,
          serviceType: counter.serviceType,
          serviceTypes: counter.serviceTypes || [],
          operationalStatus: {
            status: counter.status, // open, closed, busy
            description: getStatusDescription(counter.status),
          },
          availabilityStatus: {
            status: counter.availabilityStatus,
            description: getAvailabilityDescription(counter.availabilityStatus),
            lastChanged: counter.lastAvailabilityChange,
          },
          staffAssignment: counter.assignedStaff
            ? {
                staffId: counter.assignedStaff._id,
                name: counter.assignedStaff.name,
                email: counter.assignedStaff.email,
                department: counter.assignedStaff.department,
                role: counter.assignedStaff.role,
              }
            : null,
          currentTicket: counter.currentTicket
            ? {
                ticketId: counter.currentTicket._id,
                ticketNumber: counter.currentTicket.ticketNumber,
                priority: counter.currentTicket.priority,
                serviceType: counter.currentTicket.serviceType,
                status: counter.currentTicket.status,
              }
            : null,
          queueMetrics: {
            totalQueueLength,
            waitingCount,
            servingCount,
            estimatedWaitTime: Math.max(0, (waitingCount - 1) * 3), // in minutes
          },
          isOperational:
            counter.status !== "closed" &&
            counter.availabilityStatus !== "unavailable" &&
            counter.availabilityStatus !== "maintenance",
          createdAt: counter.createdAt,
          updatedAt: counter.updatedAt,
        };
      })
    );

    res.json({
      message: "All counters with current status",
      timestamp: new Date(),
      totalCounters: countersWithStatus.length,
      operationalCounters: countersWithStatus.filter((c) => c.isOperational)
        .length,
      busyCounters: countersWithStatus.filter((c) => c.operationalStatus.status === "busy")
        .length,
      counters: countersWithStatus.sort((a, b) =>
        a.counterName.localeCompare(b.counterName)
      ),
    });
  } catch (error) {
    console.error("Get all counters with status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET COUNTER STATUS BY ID
 * GET /api/counters/:id/status
 * Returns detailed status for a specific counter
 */
exports.getCounterStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const counter = await Counter.findById(id)
      .populate("currentTicket", "ticketNumber priority serviceType status createdAt")
      .populate("assignedStaff", "name email department role")
      .lean();

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    // Count waiting tickets
    const Ticket = require("../models/Ticket");
    const waitingCount = await Ticket.countDocuments({
      counterId: counter._id,
      status: "waiting",
    });

    const servingCount = counter.currentTicket ? 1 : 0;
    const totalQueueLength = waitingCount + servingCount;

    const counterStatus = {
      _id: counter._id,
      counterName: counter.counterName,
      serviceType: counter.serviceType,
      serviceTypes: counter.serviceTypes || [],
      operationalStatus: {
        status: counter.status,
        description: getStatusDescription(counter.status),
      },
      availabilityStatus: {
        status: counter.availabilityStatus,
        description: getAvailabilityDescription(counter.availabilityStatus),
        lastChanged: counter.lastAvailabilityChange,
      },
      staffAssignment: counter.assignedStaff
        ? {
            staffId: counter.assignedStaff._id,
            name: counter.assignedStaff.name,
            email: counter.assignedStaff.email,
            department: counter.assignedStaff.department,
            role: counter.assignedStaff.role,
          }
        : null,
      currentTicket: counter.currentTicket
        ? {
            ticketId: counter.currentTicket._id,
            ticketNumber: counter.currentTicket.ticketNumber,
            priority: counter.currentTicket.priority,
            serviceType: counter.currentTicket.serviceType,
            status: counter.currentTicket.status,
            servedSince: counter.currentTicket.createdAt,
          }
        : null,
      queueMetrics: {
        totalQueueLength,
        waitingCount,
        servingCount,
        estimatedWaitTime: Math.max(0, (waitingCount - 1) * 3), // in minutes
      },
      isOperational:
        counter.status !== "closed" &&
        counter.availabilityStatus !== "unavailable" &&
        counter.availabilityStatus !== "maintenance",
      assignmentHistory: counter.assignmentHistory?.length || 0,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
    };

    res.json({
      message: "Counter status retrieved",
      timestamp: new Date(),
      counter: counterStatus,
    });
  } catch (error) {
    console.error("Get counter status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Helper function to get status description
 */
const getStatusDescription = (status) => {
  const descriptions = {
    open: "Counter is open and ready to serve customers",
    closed: "Counter is closed and not accepting customers",
    busy: "Counter is currently serving a customer",
  };
  return descriptions[status] || "Unknown status";
};

/**
 * Helper function to get availability description
 */
const getAvailabilityDescription = (status) => {
  const descriptions = {
    available: "Counter is fully operational",
    unavailable: "Counter is temporarily unavailable",
    maintenance: "Counter is under maintenance",
    on_break: "Counter staff is on break",
  };
  return descriptions[status] || "Unknown availability";
};

/**
 * GET COUNTER METRICS BY ID
 * GET /api/counters/:id/metrics
 * Returns detailed performance metrics for a specific counter
 */
exports.getCounterMetricsById = async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = await getCounterMetrics(id);

    if (!metrics) {
      return res.status(404).json({ message: "Counter not found or no metrics available" });
    }

    res.json({
      message: "Counter metrics retrieved",
      timestamp: new Date(),
      metrics,
    });
  } catch (error) {
    console.error("Get counter metrics error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL COUNTERS METRICS
 * GET /api/counters/metrics/all
 * Returns performance metrics for all counters
 */
exports.getAllCountersMetrics = async (req, res) => {
  try {
    const metrics = await getAllCounterMetrics();

    res.json({
      message: "All counters metrics retrieved",
      timestamp: new Date(),
      totalCounters: metrics.length,
      metrics,
    });
  } catch (error) {
    console.error("Get all counters metrics error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET COUNTER COMPARISON
 * GET /api/counters/metrics/comparison
 * Compares performance across all counters
 */
exports.getCounterPerformanceComparison = async (req, res) => {
  try {
    const comparison = await getCounterComparison();

    if (!comparison) {
      return res.status(500).json({ message: "Failed to retrieve comparison data" });
    }

    res.json({
      message: "Counter performance comparison",
      ...comparison,
    });
  } catch (error) {
    console.error("Get counter comparison error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET METRICS DASHBOARD SUMMARY
 * GET /api/counters/metrics/summary
 * Returns summary metrics for dashboard display
 */
exports.getMetricsDashboardSummary = async (req, res) => {
  try {
    const summary = await getMetricsSummary();

    if (!summary) {
      return res.status(500).json({ message: "Failed to retrieve summary data" });
    }

    res.json({
      message: "Metrics dashboard summary",
      ...summary,
    });
  } catch (error) {
    console.error("Get metrics summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
