const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

/**
 * KPI Calculator Module
 * Calculates Key Performance Indicators for the queue management system
 * - Wait time metrics (average, median, percentiles)
 * - Service time metrics (average, median, percentiles)
 * - Throughput metrics (tickets/hour, tickets/day)
 * - SLA compliance metrics
 */

/**
 * Calculate wait time KPIs
 * Wait time = servedAt - createdAt
 */
exports.getWaitTimeKPIs = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      serviceType = null,
      priority = null,
    } = options;

    let matchStage = {
      status: "completed",
      servedAt: { $exists: true },
      completedAt: { $exists: true },
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    if (serviceType) matchStage.serviceType = serviceType;
    if (priority) matchStage.priority = priority;

    const waitTimes = await Ticket.aggregate([
      { $match: matchStage },
      {
        $project: {
          waitTime: {
            $divide: [
              { $subtract: ["$servedAt", "$createdAt"] },
              60000, // Convert to minutes
            ],
          },
          serviceType: 1,
          priority: 1,
        },
      },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                avgWaitTime: { $avg: "$waitTime" },
                minWaitTime: { $min: "$waitTime" },
                maxWaitTime: { $max: "$waitTime" },
                count: { $sum: 1 },
              },
            },
          ],
          percentiles: [
            {
              $sort: { waitTime: 1 },
            },
            {
              $group: {
                _id: null,
                waitTimes: { $push: "$waitTime" },
              },
            },
          ],
          byService: [
            {
              $group: {
                _id: "$serviceType",
                avgWaitTime: { $avg: "$waitTime" },
                count: { $sum: 1 },
              },
            },
            { $sort: { avgWaitTime: -1 } },
          ],
          byPriority: [
            {
              $group: {
                _id: "$priority",
                avgWaitTime: { $avg: "$waitTime" },
                count: { $sum: 1 },
              },
            },
            { $sort: { avgWaitTime: -1 } },
          ],
        },
      },
    ]);

    const result = waitTimes[0];
    const stats = result.stats[0] || {};
    const percentileData = result.percentiles[0] || { waitTimes: [] };

    // Calculate percentiles
    const sortedWaitTimes = percentileData.waitTimes.sort((a, b) => a - b);
    const p50 = percentileData.waitTimes.length
      ? sortedWaitTimes[Math.floor(sortedWaitTimes.length * 0.5)]
      : 0;
    const p95 = percentileData.waitTimes.length
      ? sortedWaitTimes[Math.floor(sortedWaitTimes.length * 0.95)]
      : 0;
    const p99 = percentileData.waitTimes.length
      ? sortedWaitTimes[Math.floor(sortedWaitTimes.length * 0.99)]
      : 0;

    return {
      summary: {
        avgWaitTime: Math.round(stats.avgWaitTime * 100) / 100,
        minWaitTime: Math.round(stats.minWaitTime * 100) / 100,
        maxWaitTime: Math.round(stats.maxWaitTime * 100) / 100,
        medianWaitTime: Math.round(p50 * 100) / 100,
        p95WaitTime: Math.round(p95 * 100) / 100,
        p99WaitTime: Math.round(p99 * 100) / 100,
        totalTickets: stats.count,
      },
      byService: result.byService.map((s) => ({
        serviceType: s._id,
        avgWaitTime: Math.round(s.avgWaitTime * 100) / 100,
        count: s.count,
      })),
      byPriority: result.byPriority.map((p) => ({
        priority: p._id,
        avgWaitTime: Math.round(p.avgWaitTime * 100) / 100,
        count: p.count,
      })),
    };
  } catch (err) {
    console.error("Wait time KPI calculation error:", err);
    throw err;
  }
};

/**
 * Calculate service time KPIs
 * Service time = completedAt - servedAt
 */
exports.getServiceTimeKPIs = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      serviceType = null,
      priority = null,
    } = options;

    let matchStage = {
      status: "completed",
      servedAt: { $exists: true },
      completedAt: { $exists: true },
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    if (serviceType) matchStage.serviceType = serviceType;
    if (priority) matchStage.priority = priority;

    const serviceTimes = await Ticket.aggregate([
      { $match: matchStage },
      {
        $project: {
          serviceTime: {
            $divide: [
              { $subtract: ["$completedAt", "$servedAt"] },
              60000, // Convert to minutes
            ],
          },
          serviceType: 1,
          priority: 1,
          counterId: 1,
        },
      },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                avgServiceTime: { $avg: "$serviceTime" },
                minServiceTime: { $min: "$serviceTime" },
                maxServiceTime: { $max: "$serviceTime" },
                count: { $sum: 1 },
              },
            },
          ],
          percentiles: [
            {
              $sort: { serviceTime: 1 },
            },
            {
              $group: {
                _id: null,
                serviceTimes: { $push: "$serviceTime" },
              },
            },
          ],
          byService: [
            {
              $group: {
                _id: "$serviceType",
                avgServiceTime: { $avg: "$serviceTime" },
                count: { $sum: 1 },
              },
            },
            { $sort: { avgServiceTime: -1 } },
          ],
          byPriority: [
            {
              $group: {
                _id: "$priority",
                avgServiceTime: { $avg: "$serviceTime" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = serviceTimes[0];
    const stats = result.stats[0] || {};
    const percentileData = result.percentiles[0] || { serviceTimes: [] };

    // Calculate percentiles
    const sortedServiceTimes = percentileData.serviceTimes.sort((a, b) => a - b);
    const p50 = percentileData.serviceTimes.length
      ? sortedServiceTimes[Math.floor(sortedServiceTimes.length * 0.5)]
      : 0;
    const p95 = percentileData.serviceTimes.length
      ? sortedServiceTimes[Math.floor(sortedServiceTimes.length * 0.95)]
      : 0;
    const p99 = percentileData.serviceTimes.length
      ? sortedServiceTimes[Math.floor(sortedServiceTimes.length * 0.99)]
      : 0;

    return {
      summary: {
        avgServiceTime: Math.round(stats.avgServiceTime * 100) / 100,
        minServiceTime: Math.round(stats.minServiceTime * 100) / 100,
        maxServiceTime: Math.round(stats.maxServiceTime * 100) / 100,
        medianServiceTime: Math.round(p50 * 100) / 100,
        p95ServiceTime: Math.round(p95 * 100) / 100,
        p99ServiceTime: Math.round(p99 * 100) / 100,
        totalTickets: stats.count,
      },
      byService: result.byService.map((s) => ({
        serviceType: s._id,
        avgServiceTime: Math.round(s.avgServiceTime * 100) / 100,
        count: s.count,
      })),
      byPriority: result.byPriority.map((p) => ({
        priority: p._id,
        avgServiceTime: Math.round(p.avgServiceTime * 100) / 100,
        count: p.count,
      })),
    };
  } catch (err) {
    console.error("Service time KPI calculation error:", err);
    throw err;
  }
};

/**
 * Calculate throughput KPIs
 * Throughput = tickets processed per unit time
 */
exports.getThroughputKPIs = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      serviceType = null,
      granularity = "hourly", // hourly, daily, weekly
    } = options;

    let matchStage = {
      status: "completed",
      completedAt: { $exists: true },
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    if (serviceType) matchStage.serviceType = serviceType;

    // Determine grouping based on granularity
    let groupId = {};
    if (granularity === "hourly") {
      groupId = {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
        hour: { $hour: "$completedAt" },
      };
    } else if (granularity === "daily") {
      groupId = {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
      };
    } else if (granularity === "weekly") {
      groupId = {
        year: { $year: "$completedAt" },
        week: { $week: "$completedAt" },
      };
    }

    const throughput = await Ticket.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          ticketsProcessed: { $sum: 1 },
          avgServiceTime: { $avg: { $subtract: ["$completedAt", "$servedAt"] } },
        },
      },
      { $sort: { "_id.date": -1, "_id.hour": -1 } },
    ]);

    // Calculate overall throughput
    const totalTickets = throughput.reduce((sum, period) => sum + period.ticketsProcessed, 0);
    const totalPeriods = throughput.length;
    const avgThroughput = totalPeriods > 0 ? Math.round(totalTickets / totalPeriods * 100) / 100 : 0;

    // Find peak and low periods
    const sorted = [...throughput].sort((a, b) => b.ticketsProcessed - a.ticketsProcessed);
    const peakPeriod = sorted[0] || {};
    const lowPeriod = sorted[sorted.length - 1] || {};

    return {
      summary: {
        totalTicketsProcessed: totalTickets,
        totalPeriods,
        avgThroughput,
        maxThroughput: peakPeriod.ticketsProcessed || 0,
        minThroughput: lowPeriod.ticketsProcessed || 0,
      },
      peakPeriod: {
        period: peakPeriod._id,
        ticketsProcessed: peakPeriod.ticketsProcessed,
      },
      lowPeriod: {
        period: lowPeriod._id,
        ticketsProcessed: lowPeriod.ticketsProcessed,
      },
      byPeriod: throughput.map((period) => ({
        period: period._id,
        ticketsProcessed: period.ticketsProcessed,
        avgServiceTime: Math.round(period.avgServiceTime / 1000 / 60 * 100) / 100,
      })),
    };
  } catch (err) {
    console.error("Throughput KPI calculation error:", err);
    throw err;
  }
};

/**
 * Calculate SLA compliance metrics
 */
exports.getSLACompliance = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      maxWaitTime = 10, // minutes
      maxServiceTime = 15, // minutes
      serviceType = null,
    } = options;

    let matchStage = {
      status: "completed",
      servedAt: { $exists: true },
      completedAt: { $exists: true },
    };

    if (startDate || endDate) {
      matchStage.completedAt = {};
      if (startDate) matchStage.completedAt.$gte = new Date(startDate);
      if (endDate) matchStage.completedAt.$lte = new Date(endDate);
    }

    if (serviceType) matchStage.serviceType = serviceType;

    const compliance = await Ticket.aggregate([
      { $match: matchStage },
      {
        $project: {
          waitTime: {
            $divide: [
              { $subtract: ["$servedAt", "$createdAt"] },
              60000, // Convert to minutes
            ],
          },
          serviceTime: {
            $divide: [
              { $subtract: ["$completedAt", "$servedAt"] },
              60000, // Convert to minutes
            ],
          },
          serviceType: 1,
          waitTimeCompliant: {
            $lte: [
              {
                $divide: [
                  { $subtract: ["$servedAt", "$createdAt"] },
                  60000,
                ],
              },
              maxWaitTime,
            ],
          },
          serviceTimeCompliant: {
            $lte: [
              {
                $divide: [
                  { $subtract: ["$completedAt", "$servedAt"] },
                  60000,
                ],
              },
              maxServiceTime,
            ],
          },
        },
      },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                waitTimeCompliant: {
                  $sum: { $cond: ["$waitTimeCompliant", 1, 0] },
                },
                serviceTimeCompliant: {
                  $sum: { $cond: ["$serviceTimeCompliant", 1, 0] },
                },
                bothCompliant: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          "$waitTimeCompliant",
                          "$serviceTimeCompliant",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          byService: [
            {
              $group: {
                _id: "$serviceType",
                totalTickets: { $sum: 1 },
                waitTimeCompliant: {
                  $sum: { $cond: ["$waitTimeCompliant", 1, 0] },
                },
                serviceTimeCompliant: {
                  $sum: { $cond: ["$serviceTimeCompliant", 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = compliance[0];
    const overall = result.overall[0] || {};

    const totalTickets = overall.totalTickets || 0;
    const waitTimeComplianceRate =
      totalTickets > 0
        ? Math.round((overall.waitTimeCompliant / totalTickets) * 100)
        : 0;
    const serviceTimeComplianceRate =
      totalTickets > 0
        ? Math.round((overall.serviceTimeCompliant / totalTickets) * 100)
        : 0;
    const overallComplianceRate =
      totalTickets > 0 ? Math.round((overall.bothCompliant / totalTickets) * 100) : 0;

    return {
      slaTargets: {
        maxWaitTime,
        maxServiceTime,
      },
      overall: {
        totalTickets,
        waitTimeCompliance: {
          compliant: overall.waitTimeCompliant,
          rate: `${waitTimeComplianceRate}%`,
        },
        serviceTimeCompliance: {
          compliant: overall.serviceTimeCompliant,
          rate: `${serviceTimeComplianceRate}%`,
        },
        overallCompliance: {
          compliant: overall.bothCompliant,
          rate: `${overallComplianceRate}%`,
        },
      },
      byService: result.byService.map((s) => ({
        serviceType: s._id,
        totalTickets: s.totalTickets,
        waitTimeComplianceRate:
          s.totalTickets > 0
            ? Math.round((s.waitTimeCompliant / s.totalTickets) * 100)
            : 0,
        serviceTimeComplianceRate:
          s.totalTickets > 0
            ? Math.round((s.serviceTimeCompliant / s.totalTickets) * 100)
            : 0,
      })),
    };
  } catch (err) {
    console.error("SLA compliance calculation error:", err);
    throw err;
  }
};

/**
 * Get comprehensive KPI report
 */
exports.getComprehensiveKPIReport = async (options = {}) => {
  try {
    const {
      startDate,
      endDate,
      serviceType = null,
    } = options;

    const [waitTimeKPIs, serviceTimeKPIs, throughputKPIs, slaCompliance] =
      await Promise.all([
        this.getWaitTimeKPIs({ startDate, endDate, serviceType }),
        this.getServiceTimeKPIs({ startDate, endDate, serviceType }),
        this.getThroughputKPIs({ startDate, endDate, serviceType, granularity: "daily" }),
        this.getSLACompliance({ startDate, endDate, serviceType }),
      ]);

    return {
      dateRange: {
        start: startDate || "all time",
        end: endDate || "all time",
      },
      waitTimeMetrics: waitTimeKPIs,
      serviceTimeMetrics: serviceTimeKPIs,
      throughputMetrics: throughputKPIs,
      slaCompliance,
      healthScore: calculateHealthScore(
        waitTimeKPIs.summary,
        serviceTimeKPIs.summary,
        slaCompliance.overall
      ),
    };
  } catch (err) {
    console.error("Comprehensive KPI report error:", err);
    throw err;
  }
};

/**
 * Calculate overall system health score (0-100)
 */
function calculateHealthScore(waitTimeMetrics, serviceTimeMetrics, slaMetrics) {
  const baseScore = 100;
  let penalties = 0;

  // Wait time penalties
  if (waitTimeMetrics.avgWaitTime > 15) penalties += 15;
  else if (waitTimeMetrics.avgWaitTime > 10) penalties += 10;
  else if (waitTimeMetrics.avgWaitTime > 5) penalties += 5;

  // Service time penalties
  if (serviceTimeMetrics.avgServiceTime > 20) penalties += 15;
  else if (serviceTimeMetrics.avgServiceTime > 15) penalties += 10;
  else if (serviceTimeMetrics.avgServiceTime > 10) penalties += 5;

  // Extract compliance rate
  const complianceRate = parseInt(slaMetrics.overallCompliance.rate);
  if (complianceRate < 70) penalties += 20;
  else if (complianceRate < 80) penalties += 15;
  else if (complianceRate < 90) penalties += 10;
  else if (complianceRate < 95) penalties += 5;

  const healthScore = Math.max(0, baseScore - penalties);

  return {
    score: Math.round(healthScore),
    status:
      healthScore >= 90
        ? "Excellent"
        : healthScore >= 75
          ? "Good"
          : healthScore >= 60
            ? "Fair"
            : "Poor",
    color:
      healthScore >= 90
        ? "green"
        : healthScore >= 75
          ? "yellow"
          : healthScore >= 60
            ? "orange"
            : "red",
  };
}

/**
 * Get KPI trends over time
 */
exports.getKPITrends = async (options = {}) => {
  try {
    const {
      days = 7,
      serviceType = null,
    } = options;

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    let matchStage = {
      status: "completed",
      servedAt: { $exists: true },
      completedAt: { $exists: true },
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (serviceType) matchStage.serviceType = serviceType;

    const trends = await Ticket.aggregate([
      { $match: matchStage },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          waitTime: {
            $divide: [
              { $subtract: ["$servedAt", "$createdAt"] },
              60000,
            ],
          },
          serviceTime: {
            $divide: [
              { $subtract: ["$completedAt", "$servedAt"] },
              60000,
            ],
          },
          serviceType: 1,
        },
      },
      {
        $group: {
          _id: "$date",
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
          ticketsProcessed: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period: {
        days,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      dailyTrends: trends.map((day) => ({
        date: day._id,
        avgWaitTime: Math.round(day.avgWaitTime * 100) / 100,
        avgServiceTime: Math.round(day.avgServiceTime * 100) / 100,
        ticketsProcessed: day.ticketsProcessed,
      })),
      trend: calculateTrendDirection(trends),
    };
  } catch (err) {
    console.error("KPI trends calculation error:", err);
    throw err;
  }
};

/**
 * Calculate trend direction
 */
function calculateTrendDirection(trends) {
  if (trends.length < 2) return "neutral";

  const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
  const secondHalf = trends.slice(Math.floor(trends.length / 2));

  const firstAvg = firstHalf.reduce((sum, t) => sum + t.avgWaitTime, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, t) => sum + t.avgWaitTime, 0) / secondHalf.length;

  if (secondAvg < firstAvg * 0.9) return "improving";
  if (secondAvg > firstAvg * 1.1) return "declining";
  return "stable";
}

module.exports = exports;
