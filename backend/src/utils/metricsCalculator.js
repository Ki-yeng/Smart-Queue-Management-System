/**
 * Counter Metrics Calculator
 * Handles calculation, tracking, and analysis of counter performance metrics
 */

const Counter = require("../models/Counter");
const Ticket = require("../models/Ticket");

/**
 * Calculate service time in seconds
 * @param {Date} servedAt - Time ticket started being served
 * @param {Date} completedAt - Time ticket was completed
 * @returns {number} Service time in seconds
 */
const calculateServiceTime = (servedAt, completedAt) => {
  if (!servedAt || !completedAt) return 0;
  return Math.round((completedAt - servedAt) / 1000); // Convert ms to seconds
};

/**
 * Update counter metrics when ticket is completed
 * @param {string} counterId - Counter ID
 * @param {Object} ticket - Completed ticket document
 * @returns {Promise<Object>} Updated counter with metrics
 */
const updateCounterMetricsOnCompletion = async (counterId, ticket) => {
  try {
    if (!counterId || !ticket) {
      console.warn("Missing counterId or ticket for metrics update");
      return null;
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      console.warn(`Counter ${counterId} not found`);
      return null;
    }

    // Calculate service time for this ticket
    const serviceTime = calculateServiceTime(ticket.servedAt, ticket.completedAt);

    // Update overall performance metrics
    const previousTotal = counter.performanceMetrics.totalTicketsServed;
    const previousTotalTime = counter.performanceMetrics.totalServiceTime || 0;

    counter.performanceMetrics.totalTicketsServed += 1;
    counter.performanceMetrics.totalServiceTime += serviceTime;
    counter.performanceMetrics.avgServiceTime = Math.round(
      counter.performanceMetrics.totalServiceTime / counter.performanceMetrics.totalTicketsServed
    );

    // Update min/max service times
    if (!counter.performanceMetrics.minServiceTime || serviceTime < counter.performanceMetrics.minServiceTime) {
      counter.performanceMetrics.minServiceTime = serviceTime;
    }
    if (!counter.performanceMetrics.maxServiceTime || serviceTime > counter.performanceMetrics.maxServiceTime) {
      counter.performanceMetrics.maxServiceTime = serviceTime;
    }

    // Update today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ticketCompletedDate = new Date(ticket.completedAt);
    ticketCompletedDate.setHours(0, 0, 0, 0);

    if (ticketCompletedDate.getTime() === today.getTime()) {
      counter.performanceMetrics.ticketsCompletedToday += 1;
    } else {
      counter.performanceMetrics.ticketsCompletedToday = 1;
    }

    counter.performanceMetrics.lastUpdated = new Date();

    // Update service type specific metrics
    if (ticket.serviceType) {
      let serviceTypeMetric = counter.serviceMetricsPerType.find(
        (m) => m.serviceType === ticket.serviceType
      );

      if (!serviceTypeMetric) {
        counter.serviceMetricsPerType.push({
          serviceType: ticket.serviceType,
          ticketsServed: 0,
          avgServiceTime: 0,
          totalServiceTime: 0,
        });
        serviceTypeMetric = counter.serviceMetricsPerType[counter.serviceMetricsPerType.length - 1];
      }

      serviceTypeMetric.ticketsServed += 1;
      serviceTypeMetric.totalServiceTime += serviceTime;
      serviceTypeMetric.avgServiceTime = Math.round(
        serviceTypeMetric.totalServiceTime / serviceTypeMetric.ticketsServed
      );
    }

    // Save updated counter
    await counter.save();

    console.log(`📊 Counter metrics updated: ${counter.counterName} (+${serviceTime}s)`);
    return counter;
  } catch (error) {
    console.error("Error updating counter metrics:", error);
    return null;
  }
};

/**
 * Get comprehensive metrics for a counter
 * @param {string} counterId - Counter ID
 * @returns {Promise<Object>} Counter metrics
 */
const getCounterMetrics = async (counterId) => {
  try {
    const counter = await Counter.findById(counterId)
      .populate("assignedStaff", "name email")
      .lean();

    if (!counter) {
      return null;
    }

    const metrics = {
      counterId: counter._id,
      counterName: counter.counterName,
      serviceType: counter.serviceType,
      assignedStaff: counter.assignedStaff,
      performance: {
        totalTicketsServed: counter.performanceMetrics.totalTicketsServed,
        avgServiceTime: Math.round(counter.performanceMetrics.avgServiceTime),
        avgServiceTimeMinutes: (counter.performanceMetrics.avgServiceTime / 60).toFixed(2),
        minServiceTime: counter.performanceMetrics.minServiceTime,
        maxServiceTime: counter.performanceMetrics.maxServiceTime,
        ticketsCompletedToday: counter.performanceMetrics.ticketsCompletedToday,
        totalServiceTime: counter.performanceMetrics.totalServiceTime,
        lastUpdated: counter.performanceMetrics.lastUpdated,
      },
      serviceTypeMetrics: counter.serviceMetricsPerType.map((m) => ({
        serviceType: m.serviceType,
        ticketsServed: m.ticketsServed,
        avgServiceTime: Math.round(m.avgServiceTime),
        avgServiceTimeMinutes: (m.avgServiceTime / 60).toFixed(2),
        totalServiceTime: m.totalServiceTime,
      })),
      availability: {
        status: counter.availabilityStatus,
        uptimePercentage: counter.performanceMetrics.uptimePercentage,
        lastMaintenanceDate: counter.performanceMetrics.lastMaintenanceDate,
      },
    };

    return metrics;
  } catch (error) {
    console.error("Error getting counter metrics:", error);
    return null;
  }
};

/**
 * Get metrics for all counters
 * @returns {Promise<Array>} Array of counter metrics
 */
const getAllCounterMetrics = async () => {
  try {
    const counters = await Counter.find()
      .populate("assignedStaff", "name email")
      .lean();

    const allMetrics = counters.map((counter) => ({
      counterId: counter._id,
      counterName: counter.counterName,
      serviceType: counter.serviceType,
      assignedStaff: counter.assignedStaff,
      ticketsServed: counter.performanceMetrics.totalTicketsServed,
      avgServiceTime: Math.round(counter.performanceMetrics.avgServiceTime),
      avgServiceTimeMinutes: (counter.performanceMetrics.avgServiceTime / 60).toFixed(2),
      ticketsCompletedToday: counter.performanceMetrics.ticketsCompletedToday,
      uptimePercentage: counter.performanceMetrics.uptimePercentage,
    }));

    return allMetrics;
  } catch (error) {
    console.error("Error getting all counter metrics:", error);
    return [];
  }
};

/**
 * Compare counter performance
 * @returns {Promise<Object>} Performance comparison data
 */
const getCounterComparison = async () => {
  try {
    const counters = await Counter.find()
      .populate("assignedStaff", "name email")
      .lean();

    const metrics = counters.map((counter) => ({
      counterName: counter.counterName,
      ticketsServed: counter.performanceMetrics.totalTicketsServed,
      avgServiceTime: counter.performanceMetrics.avgServiceTime,
      ticketsCompletedToday: counter.performanceMetrics.ticketsCompletedToday,
      status: counter.status,
    }));

    if (metrics.length === 0) {
      return {
        message: "No counters available",
        comparison: null,
      };
    }

    // Calculate averages
    const totalTickets = metrics.reduce((sum, m) => sum + m.ticketsServed, 0);
    const avgTicketsPerCounter = Math.round(totalTickets / metrics.length);
    const avgServiceTimeAcross = Math.round(
      metrics.reduce((sum, m) => sum + m.avgServiceTime, 0) / metrics.length
    );

    // Find extremes
    const mostProductive = metrics.reduce((prev, current) =>
      prev.ticketsServed > current.ticketsServed ? prev : current
    );

    const mostEfficient = metrics.reduce((prev, current) =>
      prev.avgServiceTime < current.avgServiceTime ? prev : current
    );

    return {
      timestamp: new Date(),
      summary: {
        totalCounters: metrics.length,
        totalTicketsServed: totalTickets,
        avgTicketsPerCounter,
        avgServiceTimeAcross: Math.round(avgServiceTimeAcross),
        avgServiceTimeMinutes: (avgServiceTimeAcross / 60).toFixed(2),
      },
      comparison: metrics,
      topPerformers: {
        mostProductive: {
          counterName: mostProductive.counterName,
          ticketsServed: mostProductive.ticketsServed,
        },
        mostEfficient: {
          counterName: mostEfficient.counterName,
          avgServiceTime: Math.round(mostEfficient.avgServiceTime),
          avgServiceTimeMinutes: (mostEfficient.avgServiceTime / 60).toFixed(2),
        },
      },
    };
  } catch (error) {
    console.error("Error getting counter comparison:", error);
    return null;
  }
};

/**
 * Reset daily metrics (should be called daily)
 * @returns {Promise<number>} Number of counters updated
 */
const resetDailyMetrics = async () => {
  try {
    const result = await Counter.updateMany(
      {},
      {
        $set: {
          "performanceMetrics.ticketsCompletedToday": 0,
        },
      }
    );

    console.log(`✅ Reset daily metrics for ${result.modifiedCount} counters`);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error resetting daily metrics:", error);
    return 0;
  }
};

/**
 * Archive daily metrics to history
 * Should be called at end of day
 * @returns {Promise<number>} Number of counters updated
 */
const archiveDailyMetrics = async () => {
  try {
    const counters = await Counter.find();
    let archivedCount = 0;

    for (const counter of counters) {
      if (counter.performanceMetrics.ticketsCompletedToday > 0) {
        // Add to daily metrics history
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        counter.dailyMetrics.push({
          date: today,
          ticketsServed: counter.performanceMetrics.ticketsCompletedToday,
          avgServiceTime: counter.performanceMetrics.avgServiceTime,
        });

        // Keep only last 90 days
        if (counter.dailyMetrics.length > 90) {
          counter.dailyMetrics = counter.dailyMetrics.slice(-90);
        }

        await counter.save();
        archivedCount++;
      }
    }

    console.log(`✅ Archived daily metrics for ${archivedCount} counters`);
    return archivedCount;
  } catch (error) {
    console.error("Error archiving daily metrics:", error);
    return 0;
  }
};

/**
 * Get counter metrics summary for dashboard
 * @returns {Promise<Object>} Summary metrics
 */
const getMetricsSummary = async () => {
  try {
    const counters = await Counter.find().lean();

    if (counters.length === 0) {
      return {
        message: "No counters available",
        summary: null,
      };
    }

    const summary = {
      timestamp: new Date(),
      totalCounters: counters.length,
      metrics: {
        totalTicketsServed: 0,
        avgTicketsPerCounter: 0,
        avgServiceTime: 0,
        avgServiceTimeMinutes: "0.00",
        ticketsServedToday: 0,
      },
      topCounters: [],
    };

    // Calculate aggregates
    for (const counter of counters) {
      summary.metrics.totalTicketsServed += counter.performanceMetrics.totalTicketsServed || 0;
      summary.metrics.ticketsServedToday += counter.performanceMetrics.ticketsCompletedToday || 0;
    }

    summary.metrics.avgTicketsPerCounter = Math.round(
      summary.metrics.totalTicketsServed / counters.length
    );

    // Calculate average service time
    const totalServiceTime = counters.reduce(
      (sum, c) => sum + (c.performanceMetrics.totalServiceTime || 0),
      0
    );
    const totalTickets = counters.reduce(
      (sum, c) => sum + (c.performanceMetrics.totalTicketsServed || 0),
      0
    );

    if (totalTickets > 0) {
      summary.metrics.avgServiceTime = Math.round(totalServiceTime / totalTickets);
      summary.metrics.avgServiceTimeMinutes = (summary.metrics.avgServiceTime / 60).toFixed(2);
    }

    // Get top 5 counters by tickets served
    summary.topCounters = counters
      .sort((a, b) => {
        const aTickets = a.performanceMetrics.totalTicketsServed || 0;
        const bTickets = b.performanceMetrics.totalTicketsServed || 0;
        return bTickets - aTickets;
      })
      .slice(0, 5)
      .map((c) => ({
        counterName: c.counterName,
        ticketsServed: c.performanceMetrics.totalTicketsServed,
        avgServiceTime: Math.round(c.performanceMetrics.avgServiceTime),
      }));

    return summary;
  } catch (error) {
    console.error("Error getting metrics summary:", error);
    return null;
  }
};

module.exports = {
  calculateServiceTime,
  updateCounterMetricsOnCompletion,
  getCounterMetrics,
  getAllCounterMetrics,
  getCounterComparison,
  resetDailyMetrics,
  archiveDailyMetrics,
  getMetricsSummary,
};
