/**
 * Real-time Counter Load Balancing Logic
 * Distributes tickets optimally across available counters based on queue length,
 * service capacity, priority levels, and operational metrics
 */

const Counter = require("../models/Counter");
const Ticket = require("../models/Ticket");

/**
 * Calculate load metrics for a single counter
 * Returns a score indicating how busy/loaded the counter is
 * @param {Object} counter - Counter document with populated data
 * @returns {Object} Load metrics for the counter
 */
const calculateCounterLoadMetrics = async (counter) => {
  try {
    // Count waiting tickets assigned to this counter by service type
    const waitingCount = await Ticket.countDocuments({
      counterId: counter._id,
      status: "waiting",
    });

    // Count serving tickets
    const servingCount = counter.currentTicket ? 1 : 0;

    // Total queue length
    const totalQueueLength = waitingCount + servingCount;

    // Calculate load score (0-100)
    // Based on queue length, counter status, and availability
    let loadScore = 0;

    if (counter.status === "closed" || counter.availabilityStatus === "unavailable") {
      loadScore = 100; // Unavailable counters have max load (shouldn't use them)
    } else if (counter.status === "busy") {
      loadScore = Math.min(80 + (waitingCount * 5), 99);
    } else if (counter.status === "open") {
      loadScore = Math.min(totalQueueLength * 10, 80);
    }

    // Adjust for maintenance
    if (counter.availabilityStatus === "maintenance" || counter.availabilityStatus === "on_break") {
      loadScore = 100;
    }

    return {
      counterId: counter._id,
      counterName: counter.counterName,
      status: counter.status,
      availabilityStatus: counter.availabilityStatus,
      serviceTypes: counter.serviceTypes || [counter.serviceType],
      assignedStaff: counter.assignedStaff,
      waitingCount,
      servingCount,
      totalQueueLength,
      loadScore: Math.round(loadScore),
      isAvailable: 
        counter.status !== "closed" && 
        counter.availabilityStatus !== "unavailable" && 
        counter.availabilityStatus !== "maintenance",
      estimatedWaitTime: calculateEstimatedWaitTime(totalQueueLength),
      lastAvailabilityChange: counter.lastAvailabilityChange,
    };
  } catch (error) {
    console.error(`Error calculating load metrics for counter ${counter._id}:`, error);
    return null;
  }
};

/**
 * Calculate estimated wait time based on queue length
 * Assumes average service time of 3 minutes per customer
 * @param {number} queueLength - Number of customers in queue
 * @returns {number} Estimated wait time in minutes
 */
const calculateEstimatedWaitTime = (queueLength) => {
  const avgServiceTimeMinutes = 3;
  return Math.max(0, (queueLength - 1) * avgServiceTimeMinutes);
};

/**
 * Get all counters sorted by load level
 * @param {string} serviceType - Service type filter (optional)
 * @returns {Promise<Array>} Array of counters sorted by load score (lowest first)
 */
const getCountersByLoad = async (serviceType = null) => {
  try {
    // Build filter query
    let filter = {
      status: { $ne: "closed" },
      availabilityStatus: { 
        $nin: ["unavailable", "maintenance"] 
      }
    };

    if (serviceType) {
      filter.$or = [
        { serviceType },
        { serviceTypes: serviceType }
      ];
    }

    const counters = await Counter.find(filter)
      .populate("currentTicket", "ticketNumber priority")
      .populate("assignedStaff", "name email");

    // Calculate load metrics for each counter
    const counterMetrics = await Promise.all(
      counters.map((counter) => calculateCounterLoadMetrics(counter))
    );

    // Filter out null values (errors) and sort by load score
    return counterMetrics
      .filter((metric) => metric !== null)
      .sort((a, b) => a.loadScore - b.loadScore);
  } catch (error) {
    console.error("Error getting counters by load:", error);
    return [];
  }
};

/**
 * Find the best available counter for a ticket using load balancing
 * Considers queue length, counter status, service capability, and availability
 * @param {string} serviceType - The service type the ticket needs
 * @param {string} priority - Priority level of the ticket
 * @returns {Promise<Object|null>} Best counter or null if none available
 */
const findBestCounterForTicket = async (serviceType, priority = "normal") => {
  try {
    // Get all available counters for this service type, sorted by load
    const availableCounters = await getCountersByLoad(serviceType);

    if (availableCounters.length === 0) {
      console.log(`⚠️  No available counters for service type: ${serviceType}`);
      return null;
    }

    // For high-priority tickets, prefer counters with shorter queues
    // (lower load score)
    if (priority === "urgent" || priority === "high" || priority === "vip") {
      // Prefer counters with minimal queue
      return availableCounters[0];
    }

    // For normal priority, use round-robin with slight preference for less loaded counters
    // Find counters with reasonable load (below 50)
    const reasonablyLoadedCounters = availableCounters.filter(
      (counter) => counter.loadScore < 50 && counter.isAvailable
    );

    if (reasonablyLoadedCounters.length > 0) {
      return reasonablyLoadedCounters[0];
    }

    // If all counters are busy, return the least busy one
    return availableCounters[0];
  } catch (error) {
    console.error("Error finding best counter:", error);
    return null;
  }
};

/**
 * Suggest optimal counter reassignments to balance load
 * This can be called periodically to redistribute tickets
 * @param {number} loadThreshold - Load score threshold (default 70)
 * @returns {Promise<Array>} Array of suggested reassignments
 */
const suggestLoadRebalancing = async (loadThreshold = 70) => {
  try {
    const suggestions = [];

    // Get all counters with their metrics
    const counters = await Counter.find({
      status: { $ne: "closed" },
      availabilityStatus: { $nin: ["unavailable", "maintenance"] }
    })
      .populate("currentTicket", "ticketNumber priority")
      .populate("assignedStaff", "name email");

    const allMetrics = await Promise.all(
      counters.map((counter) => calculateCounterLoadMetrics(counter))
    );

    // Find overloaded counters
    const overloadedCounters = allMetrics.filter(
      (metric) => metric.loadScore > loadThreshold && metric.totalQueueLength > 1
    );

    // Find underutilized counters
    const underutilizedCounters = allMetrics.filter(
      (metric) => metric.loadScore < 30 && metric.isAvailable
    );

    // Generate rebalancing suggestions
    for (const overloaded of overloadedCounters) {
      if (underutilizedCounters.length === 0) break;

      const underutilized = underutilizedCounters[0];

      // Check if they handle the same service types
      const overloadedServices = new Set(overloaded.serviceTypes);
      const underutilizedServices = new Set(underutilized.serviceTypes);
      
      const commonServices = [...overloadedServices].filter(
        (service) => underutilizedServices.has(service)
      );

      if (commonServices.length > 0) {
        suggestions.push({
          action: "redistribute_tickets",
          fromCounter: {
            id: overloaded.counterId,
            name: overloaded.counterName,
            loadScore: overloaded.loadScore,
            queueLength: overloaded.totalQueueLength,
          },
          toCounter: {
            id: underutilized.counterId,
            name: underutilized.counterName,
            loadScore: underutilized.loadScore,
            queueLength: underutilized.totalQueueLength,
          },
          commonServices,
          reason: `Move tickets from overloaded ${overloaded.counterName} (load: ${overloaded.loadScore}%) to ${underutilized.counterName} (load: ${underutilized.loadScore}%)`,
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error("Error suggesting load rebalancing:", error);
    return [];
  }
};

/**
 * Get comprehensive load balancing dashboard data
 * @returns {Promise<Object>} Dashboard metrics for monitoring system load
 */
const getLoadBalancingDashboard = async () => {
  try {
    const counters = await Counter.find()
      .populate("currentTicket", "ticketNumber priority")
      .populate("assignedStaff", "name email");

    const metrics = await Promise.all(
      counters.map((counter) => calculateCounterLoadMetrics(counter))
    );

    const validMetrics = metrics.filter((m) => m !== null);

    // Calculate aggregate statistics
    const avgLoadScore = validMetrics.length > 0
      ? Math.round(
          validMetrics.reduce((sum, m) => sum + m.loadScore, 0) / validMetrics.length
        )
      : 0;

    const totalQueueLength = validMetrics.reduce(
      (sum, m) => sum + m.totalQueueLength,
      0
    );

    const availableCounters = validMetrics.filter((m) => m.isAvailable).length;
    const busyCounters = validMetrics.filter((m) => m.status === "busy").length;
    const overloadedCounters = validMetrics.filter(
      (m) => m.loadScore > 70
    ).length;

    // Find counter with highest and lowest load
    const mostLoaded = validMetrics.reduce((prev, current) =>
      prev.loadScore > current.loadScore ? prev : current
    );

    const leastLoaded = validMetrics.reduce((prev, current) =>
      prev.loadScore < current.loadScore ? prev : current
    );

    return {
      timestamp: new Date(),
      summary: {
        totalCounters: validMetrics.length,
        availableCounters,
        busyCounters,
        overloadedCounters,
        totalQueueLength,
        avgLoadScore,
        systemLoad: avgLoadScore > 70 ? "high" : avgLoadScore > 40 ? "moderate" : "low",
      },
      counterMetrics: validMetrics.sort((a, b) => a.loadScore - b.loadScore),
      mostLoaded,
      leastLoaded,
      recommendations: await suggestLoadRebalancing(),
    };
  } catch (error) {
    console.error("Error getting load balancing dashboard:", error);
    return null;
  }
};

/**
 * Monitor and emit real-time load updates via Socket.io
 * Should be called periodically to update clients
 * @param {Object} io - Socket.io instance
 * @param {number} interval - Interval in milliseconds (default: 10 seconds)
 */
const startLoadBalancingMonitor = (io, interval = 10000) => {
  if (!io) {
    console.warn("⚠️  Socket.io instance not provided for load monitoring");
    return;
  }

  const monitor = async () => {
    try {
      const dashboard = await getLoadBalancingDashboard();
      if (dashboard) {
        io.emit("loadMetricsUpdated", {
          timestamp: dashboard.timestamp,
          summary: dashboard.summary,
          counterMetrics: dashboard.counterMetrics,
          recommendations: dashboard.recommendations,
        });
        
        // Also emit service-specific load updates
        const services = [...new Set(dashboard.counterMetrics.map(m => m.serviceTypes).flat())];
        for (const service of services) {
          const serviceMetrics = dashboard.counterMetrics.filter(m => 
            m.serviceTypes.includes(service)
          );
          io.to(`service-${service}`).emit("service-load-updated", {
            serviceType: service,
            counterMetrics: serviceMetrics,
            avgLoad: Math.round(serviceMetrics.reduce((sum, m) => sum + m.loadScore, 0) / serviceMetrics.length),
          });
        }
      }
    } catch (error) {
      console.error("Error in load monitoring:", error);
    }
  };

  // Run immediately on start
  monitor();

  // Then run periodically
  return setInterval(monitor, interval);
};

/**
 * Auto-assign next waiting ticket to the best available counter
 * Uses load balancing to find optimal counter
 * @param {string} serviceType - Service type to assign
 * @param {Object} io - Socket.io instance for events
 * @returns {Promise<Object>} Assignment result
 */
const autoAssignTicketToOptimalCounter = async (serviceType, io = null) => {
  try {
    // Get next high-priority waiting ticket
    const nextTicket = await Ticket.findOne({
      serviceType,
      status: "waiting"
    })
      .sort({ priorityScore: -1, createdAt: 1 })
      .populate("userId", "name email");

    if (!nextTicket) {
      return { success: false, message: "No waiting tickets" };
    }

    // Find best counter using load balancing
    const bestCounter = await findBestCounterForTicket(serviceType, nextTicket.priority);

    if (!bestCounter) {
      return { success: false, message: "No available counters" };
    }

    // Find the actual counter document
    const counter = await Counter.findById(bestCounter.counterId)
      .populate("assignedStaff", "name");

    // Update ticket to serving
    nextTicket.status = "serving";
    nextTicket.servedAt = new Date();
    nextTicket.counterId = counter._id;
    await nextTicket.save();

    // Update counter
    counter.status = "busy";
    counter.currentTicket = nextTicket._id;
    await counter.save();

    // Emit Socket.IO events
    if (io) {
      const socketEvents = require("./socketEvents");
      socketEvents.emitTicketServing(io, nextTicket, counter.counterName);
      socketEvents.emitCounterStatusUpdated(io, counter);
      socketEvents.emitQueueUpdated(io, serviceType);

      // Emit load update for this service
      const metrics = await calculateCounterLoadMetrics(counter);
      io.to(`service-${serviceType}`).emit("counter-assigned-ticket", {
        ticket: nextTicket,
        counter: bestCounter,
        currentMetrics: metrics,
      });
    }

    return {
      success: true,
      message: "Ticket auto-assigned to optimal counter",
      ticket: nextTicket,
      assignedCounter: bestCounter,
    };
  } catch (error) {
    console.error("Error in auto-assign:", error);
    return { success: false, message: "Server error", error: error.message };
  }
};

/**
 * Rebalance waiting tickets for a service type
 * Redistributes tickets to achieve optimal load distribution
 * @param {string} serviceType - Service type to rebalance
 * @param {Object} io - Socket.io instance
 * @returns {Promise<Object>} Rebalancing result
 */
const rebalanceServiceQueue = async (serviceType, io = null) => {
  try {
    const result = {
      serviceType,
      ticketsProcessed: 0,
      ticketsAssigned: 0,
      ticketsSkipped: 0,
      timestamp: new Date(),
    };

    // Get all waiting tickets for this service
    const waitingTickets = await Ticket.find({
      serviceType,
      status: "waiting"
    })
      .sort({ priorityScore: -1, createdAt: 1 })
      .limit(20); // Process max 20 tickets per rebalance

    for (const ticket of waitingTickets) {
      result.ticketsProcessed++;

      const bestCounter = await findBestCounterForTicket(serviceType, ticket.priority);

      if (!bestCounter) {
        result.ticketsSkipped++;
        continue;
      }

      const counter = await Counter.findById(bestCounter.counterId)
        .populate("assignedStaff", "name");

      ticket.status = "serving";
      ticket.servedAt = new Date();
      ticket.counterId = counter._id;
      await ticket.save();

      counter.status = "busy";
      counter.currentTicket = ticket._id;
      await counter.save();

      result.ticketsAssigned++;

      if (io) {
        const socketEvents = require("./socketEvents");
        socketEvents.emitTicketServing(io, ticket, counter.counterName);
      }
    }

    // Emit rebalancing complete event
    if (io) {
      const dashboard = await getLoadBalancingDashboard();
      io.to(`service-${serviceType}`).emit("queue-rebalanced", {
        serviceType,
        result,
        updatedMetrics: dashboard,
      });
    }

    return result;
  } catch (error) {
    console.error("Error in rebalance:", error);
    return {
      serviceType,
      ticketsProcessed: 0,
      ticketsAssigned: 0,
      ticketsSkipped: 0,
      error: error.message,
    };
  }
};

/**
 * Get load balancing insights for optimization
 * Returns detailed analysis and recommendations
 * @returns {Promise<Object>} Comprehensive insights
 */
const getLoadOptimizationInsights = async () => {
  try {
    const dashboard = await getLoadBalancingDashboard();
    const suggestions = await suggestLoadRebalancing();

    // Analyze patterns
    const serviceTypeAnalysis = {};
    for (const metric of dashboard.counterMetrics) {
      for (const service of metric.serviceTypes) {
        if (!serviceTypeAnalysis[service]) {
          serviceTypeAnalysis[service] = {
            counters: [],
            totalLoad: 0,
            avgLoadScore: 0,
          };
        }
        serviceTypeAnalysis[service].counters.push(metric);
        serviceTypeAnalysis[service].totalLoad += metric.loadScore;
      }
    }

    // Calculate averages and identify bottlenecks
    const insights = {
      timestamp: new Date(),
      overallHealth: dashboard.summary.systemLoad,
      criticalMetrics: {
        avgLoadScore: dashboard.summary.avgLoadScore,
        totalQueueLength: dashboard.summary.totalQueueLength,
        overloadedCounters: dashboard.summary.overloadedCounters,
        utilizationRate: Math.round(
          (dashboard.summary.busyCounters / dashboard.summary.totalCounters) * 100
        ),
      },
      serviceAnalysis: {},
      recommendations: suggestions,
      bottlenecks: [],
      optimizations: [],
    };

    // Service-level analysis
    for (const [service, data] of Object.entries(serviceTypeAnalysis)) {
      const avgLoad = Math.round(data.totalLoad / data.counters.length);
      insights.serviceAnalysis[service] = {
        availableCounters: data.counters.length,
        avgLoad,
        overloadedCounters: data.counters.filter(c => c.loadScore > 70).length,
        totalQueue: data.counters.reduce((sum, c) => sum + c.totalQueueLength, 0),
      };

      // Identify bottlenecks
      if (avgLoad > 70 && insights.serviceAnalysis[service].totalQueue > 5) {
        insights.bottlenecks.push({
          service,
          reason: "High load and queue length",
          severity: avgLoad > 85 ? "critical" : "warning",
          recommendation: "Consider adding more staff or counters",
        });
      }
    }

    // Optimization suggestions
    if (dashboard.summary.overloadedCounters > 0) {
      insights.optimizations.push({
        action: "redistribute_staff",
        priority: "high",
        details: `${dashboard.summary.overloadedCounters} counter(s) are overloaded. Consider reassigning staff.`,
      });
    }

    if (dashboard.summary.avgLoadScore < 30) {
      insights.optimizations.push({
        action: "consolidate_counters",
        priority: "low",
        details: "System is underutilized. Consider closing some counters to reduce operational costs.",
      });
    }

    return insights;
  } catch (error) {
    console.error("Error getting optimization insights:", error);
    return null;
  }
};

module.exports = {
  calculateCounterLoadMetrics,
  calculateEstimatedWaitTime,
  getCountersByLoad,
  findBestCounterForTicket,
  suggestLoadRebalancing,
  getLoadBalancingDashboard,
  startLoadBalancingMonitor,
  autoAssignTicketToOptimalCounter,
  rebalanceServiceQueue,
  getLoadOptimizationInsights,
};
