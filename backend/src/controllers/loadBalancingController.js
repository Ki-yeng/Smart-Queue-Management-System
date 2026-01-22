/**
 * Load Balancing Controller
 * Handles real-time counter load balancing operations and monitoring
 */

const {
  getCountersByLoad,
  findBestCounterForTicket,
  suggestLoadRebalancing,
  getLoadBalancingDashboard,
  autoAssignTicketToOptimalCounter,
  rebalanceServiceQueue,
  getLoadOptimizationInsights,
} = require("../utils/loadBalancer");

/**
 * Get current load status for all counters
 * GET /api/load-balance/status
 */
exports.getSystemLoadStatus = async (req, res) => {
  try {
    const dashboard = await getLoadBalancingDashboard();

    if (!dashboard) {
      return res.status(500).json({ message: "Failed to calculate load metrics" });
    }

    res.json({
      message: "System load status retrieved",
      status: dashboard,
    });
  } catch (err) {
    console.error("Error getting load status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get load status for a specific service type
 * GET /api/load-balance/service/:serviceType
 */
exports.getServiceLoadStatus = async (req, res) => {
  try {
    const { serviceType } = req.params;

    const counters = await getCountersByLoad(serviceType);

    if (counters.length === 0) {
      return res.status(404).json({
        message: `No counters found for service type: ${serviceType}`,
      });
    }

    // Calculate service-level metrics
    const avgLoadScore = Math.round(
      counters.reduce((sum, c) => sum + c.loadScore, 0) / counters.length
    );

    const totalQueueLength = counters.reduce((sum, c) => sum + c.totalQueueLength, 0);
    const availableCounters = counters.filter((c) => c.isAvailable).length;

    res.json({
      message: `Load status for ${serviceType} retrieved`,
      serviceType,
      timestamp: new Date(),
      summary: {
        totalCounters: counters.length,
        availableCounters,
        busyCounters: counters.filter((c) => c.status === "busy").length,
        totalQueueLength,
        avgLoadScore,
        systemHealth:
          avgLoadScore < 40 ? "healthy" : avgLoadScore < 70 ? "moderate" : "overloaded",
      },
      counters: counters.map((c) => ({
        id: c.counterId,
        name: c.counterName,
        status: c.status,
        availabilityStatus: c.availabilityStatus,
        loadScore: c.loadScore,
        queueLength: c.totalQueueLength,
        estimatedWaitTime: `${c.estimatedWaitTime} minutes`,
        staffAssigned: c.assignedStaff?.name || "Unassigned",
      })),
    });
  } catch (err) {
    console.error("Error getting service load status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Find the best counter for a ticket
 * GET /api/load-balance/best-counter
 * Query: ?serviceType=Finance&priority=high
 */
exports.getBestCounterForTicket = async (req, res) => {
  try {
    const { serviceType, priority = "normal" } = req.query;

    if (!serviceType) {
      return res.status(400).json({ message: "serviceType is required" });
    }

    const bestCounter = await findBestCounterForTicket(serviceType, priority);

    if (!bestCounter) {
      return res.status(404).json({
        message: `No available counters for service: ${serviceType}`,
      });
    }

    res.json({
      message: "Best counter identified",
      recommendation: {
        counterId: bestCounter.counterId,
        counterName: bestCounter.counterName,
        currentLoad: bestCounter.loadScore,
        reason: `Counter has lowest load score (${bestCounter.loadScore}%) with queue length of ${bestCounter.totalQueueLength}`,
        estimatedWaitTime: `${bestCounter.estimatedWaitTime} minutes`,
        staffAssigned: bestCounter.assignedStaff?.name || "Unassigned",
      },
    });
  } catch (err) {
    console.error("Error finding best counter:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get load balancing recommendations
 * GET /api/load-balance/recommendations
 */
exports.getLoadRecommendations = async (req, res) => {
  try {
    const suggestions = await suggestLoadRebalancing();

    res.json({
      message: "Load rebalancing recommendations retrieved",
      timestamp: new Date(),
      totalSuggestions: suggestions.length,
      suggestions: suggestions.map((s) => ({
        action: s.action,
        fromCounter: {
          id: s.fromCounter.id,
          name: s.fromCounter.name,
          currentLoad: s.fromCounter.loadScore,
          queueLength: s.fromCounter.queueLength,
        },
        toCounter: {
          id: s.toCounter.id,
          name: s.toCounter.name,
          currentLoad: s.toCounter.loadScore,
          queueLength: s.toCounter.queueLength,
        },
        services: s.commonServices,
        reason: s.reason,
      })),
    });
  } catch (err) {
    console.error("Error getting recommendations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Auto-assign waiting ticket to optimal counter
 * POST /api/load-balance/auto-assign
 * Body: { serviceType: "Finance" }
 */
exports.autoAssignTicket = async (req, res) => {
  try {
    const { serviceType } = req.body;

    if (!serviceType) {
      return res.status(400).json({ message: "serviceType is required" });
    }

    const io = req.app?.get("io");

    const result = await autoAssignTicketToOptimalCounter(serviceType, io);

    if (!result.success) {
      return res.status(404).json({
        message: result.message,
      });
    }

    res.json({
      message: result.message,
      ticket: {
        id: result.ticket._id,
        ticketNumber: result.ticket.ticketNumber,
        status: result.ticket.status,
      },
      assignedCounter: result.assignedCounter,
    });
  } catch (err) {
    console.error("Error auto-assigning ticket:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Manually trigger service queue rebalancing
 * POST /api/load-balance/rebalance/:serviceType
 */
exports.rebalanceService = async (req, res) => {
  try {
    const { serviceType } = req.params;

    const io = req.app?.get("io");

    const result = await rebalanceServiceQueue(serviceType, io);

    res.json({
      message: `Queue rebalancing completed for ${serviceType}`,
      result: {
        serviceType,
        ticketsProcessed: result.ticketsProcessed,
        ticketsAssigned: result.ticketsAssigned,
        ticketsSkipped: result.ticketsSkipped,
        successRate: result.ticketsProcessed > 0
          ? Math.round((result.ticketsAssigned / result.ticketsProcessed) * 100)
          : 0,
      },
    });
  } catch (err) {
    console.error("Error rebalancing service:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get detailed load optimization insights
 * GET /api/load-balance/insights
 */
exports.getOptimizationInsights = async (req, res) => {
  try {
    const insights = await getLoadOptimizationInsights();

    if (!insights) {
      return res.status(500).json({ message: "Failed to generate insights" });
    }

    res.json({
      message: "Load optimization insights retrieved",
      insights,
    });
  } catch (err) {
    console.error("Error getting insights:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all counters sorted by load for a service
 * GET /api/load-balance/counters-by-load?serviceType=Finance
 */
exports.getCountersSortedByLoad = async (req, res) => {
  try {
    const { serviceType = null } = req.query;

    const counters = await getCountersByLoad(serviceType);

    if (counters.length === 0) {
      return res.status(404).json({
        message: serviceType
          ? `No counters found for service: ${serviceType}`
          : "No counters found",
      });
    }

    res.json({
      message: "Counters retrieved sorted by load",
      filter: serviceType || "all",
      totalCounters: counters.length,
      counters: counters.map((c) => ({
        id: c.counterId,
        name: c.counterName,
        status: c.status,
        availabilityStatus: c.availabilityStatus,
        loadScore: c.loadScore,
        queueLength: c.totalQueueLength,
        waitingTickets: c.waitingCount,
        servingTickets: c.servingCount,
        estimatedWaitTime: `${c.estimatedWaitTime} minutes`,
        staffAssigned: c.assignedStaff?.name || "Unassigned",
        isAvailable: c.isAvailable,
      })),
    });
  } catch (err) {
    console.error("Error getting counters by load:", err);
    res.status(500).json({ message: "Server error" });
  }
};
