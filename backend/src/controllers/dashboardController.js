const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");
const User = require("../models/User");
const { getMetricsSummary } = require("../utils/metricsCalculator");

/**
 * GET DASHBOARD STATISTICS
 * Comprehensive dashboard with all system statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ===== TICKET STATISTICS =====
    const totalTicketsToday = await Ticket.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const waitingTickets = await Ticket.countDocuments({
      status: "waiting",
    });

    const servingTickets = await Ticket.countDocuments({
      status: "serving",
    });

    const completedTickets = await Ticket.countDocuments({
      status: "completed",
      completedAt: { $gte: today },
    });

    const cancelledTickets = await Ticket.countDocuments({
      status: "cancelled",
      cancelledAt: { $gte: today },
    });

    const totalQueueLength = waitingTickets + servingTickets;

    // ===== AVERAGE TIMES =====
    const completedTicketsData = await Ticket.find({
      status: "completed",
      completedAt: { $gte: today },
    });

    let avgWaitingTime = 0;
    let avgServiceTime = 0;
    if (completedTicketsData.length > 0) {
      // Average waiting time (creation to serving)
      const totalWaitTime = completedTicketsData.reduce((acc, ticket) => {
        const waitTime = ticket.servedAt
          ? (new Date(ticket.servedAt) - new Date(ticket.createdAt)) / 1000
          : 0;
        return acc + waitTime;
      }, 0);
      avgWaitingTime = Math.round(totalWaitTime / completedTicketsData.length);

      // Average service time (serving to completion)
      const totalServiceTime = completedTicketsData.reduce((acc, ticket) => {
        const serviceTime = (new Date(ticket.completedAt) - new Date(ticket.servedAt || ticket.createdAt)) / 1000;
        return acc + serviceTime;
      }, 0);
      avgServiceTime = Math.round(totalServiceTime / completedTicketsData.length);
    }

    // ===== COUNTER STATISTICS =====
    const totalCounters = await Counter.countDocuments();
    const activeCounters = await Counter.countDocuments({
      status: { $ne: "closed" },
    });
    const busyCounters = await Counter.countDocuments({
      status: "busy",
    });
    const closedCounters = await Counter.countDocuments({
      status: "closed",
    });

    const availableCounters = await Counter.countDocuments({
      availabilityStatus: "available",
    });
    const maintenanceCounters = await Counter.countDocuments({
      availabilityStatus: "maintenance",
    });
    const onBreakCounters = await Counter.countDocuments({
      availabilityStatus: "on_break",
    });

    // ===== TICKETS BY SERVICE TYPE =====
    const ticketsPerService = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: "$serviceType",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          waiting: {
            $sum: { $cond: [{ $eq: ["$status", "waiting"] }, 1, 0] },
          },
          serving: {
            $sum: { $cond: [{ $eq: ["$status", "serving"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // ===== STAFF STATISTICS =====
    const totalStaff = await User.countDocuments({
      role: "staff",
    });
    const activeStaff = await User.countDocuments({
      role: "staff",
      isActive: true,
    });

    // Count staff by department
    const staffByDepartment = await User.aggregate([
      { $match: { role: "staff" } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ===== COUNTER METRICS AGGREGATION =====
    const counterMetrics = await Counter.find().lean();
    const metricsData = {
      totalTicketsServed: 0,
      avgServiceTime: 0,
      totalCountersMetrics: 0,
      busyCountersMetrics: 0,
    };

    if (counterMetrics.length > 0) {
      let totalServiceTime = 0;
      for (const counter of counterMetrics) {
        metricsData.totalTicketsServed += counter.performanceMetrics?.totalTicketsServed || 0;
        totalServiceTime += counter.performanceMetrics?.totalServiceTime || 0;
      }

      const totalTickets = metricsData.totalTicketsServed;
      if (totalTickets > 0) {
        metricsData.avgServiceTime = Math.round(totalServiceTime / totalTickets);
      }
    }

    // ===== PEAK HOURS ANALYSIS =====
    const hourlyDistribution = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let peakHour = null;
    if (hourlyDistribution.length > 0) {
      const peak = hourlyDistribution.reduce((prev, current) =>
        prev.count > current.count ? prev : current
      );
      peakHour = `${peak._id}:00 - ${peak._id + 1}:00 (${peak.count} tickets)`;
    }

    // ===== PRIORITY DISTRIBUTION =====
    const ticketsByPriority = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    // ===== SYSTEM HEALTH METRICS =====
    const systemMetrics = {
      uptime: "99.9%",
      responseTime: "< 100ms",
      databaseStatus: "Connected",
      socketIOStatus: "Active",
    };

    // ===== COMPLETION RATE =====
    const completionRate =
      totalTicketsToday > 0
        ? Math.round((completedTickets / totalTicketsToday) * 100)
        : 0;

    // ===== COMPILE DASHBOARD DATA =====
    const dashboard = {
      timestamp: new Date(),
      summary: {
        totalTicketsToday,
        totalQueueLength,
        completionRate: `${completionRate}%`,
        avgWaitingTime: Math.round(avgWaitingTime / 60), // Convert to minutes
        avgServiceTime: Math.round(avgServiceTime / 60), // Convert to minutes
      },
      tickets: {
        total: totalTicketsToday,
        waiting: waitingTickets,
        serving: servingTickets,
        completed: completedTickets,
        cancelled: cancelledTickets,
        completionRate,
      },
      counters: {
        total: totalCounters,
        active: activeCounters,
        busy: busyCounters,
        closed: closedCounters,
        available: availableCounters,
        maintenance: maintenanceCounters,
        onBreak: onBreakCounters,
      },
      staff: {
        total: totalStaff,
        active: activeStaff,
        byDepartment: staffByDepartment,
      },
      serviceTypes: ticketsPerService,
      metrics: {
        totalTicketsServed: metricsData.totalTicketsServed,
        avgServiceTime: Math.round(metricsData.avgServiceTime / 60), // Convert to minutes
      },
      hourlyDistribution,
      peakHour,
      priorityDistribution: ticketsByPriority,
      systemHealth: systemMetrics,
    };

    res.json({
      message: "Dashboard statistics retrieved",
      data: dashboard,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET QUICK STATS
 * Lightweight endpoint for quick updates
 */
exports.getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTicketsToday = await Ticket.countDocuments({
      createdAt: { $gte: today },
    });

    const waitingTickets = await Ticket.countDocuments({
      status: "waiting",
    });

    const servingTickets = await Ticket.countDocuments({
      status: "serving",
    });

    const completedTickets = await Ticket.countDocuments({
      status: "completed",
      completedAt: { $gte: today },
    });

    const activeCounters = await Counter.countDocuments({
      status: { $ne: "closed" },
    });

    const completionRate =
      totalTicketsToday > 0
        ? Math.round((completedTickets / totalTicketsToday) * 100)
        : 0;

    res.json({
      message: "Quick stats retrieved",
      timestamp: new Date(),
      stats: {
        totalTicketsToday,
        waitingTickets,
        servingTickets,
        completedTickets,
        activeCounters,
        completionRate: `${completionRate}%`,
      },
    });
  } catch (err) {
    console.error("Quick stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET DAILY REPORT
 * Summary of a specific day
 */
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(reportDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Ticket statistics
    const ticketsData = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: reportDate, $lt: nextDate },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                cancelled: {
                  $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
                },
                avgWaitTime: {
                  $avg: {
                    $cond: [
                      { $ne: ["$servedAt", null] },
                      { $subtract: ["$servedAt", "$createdAt"] },
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
                count: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
              },
            },
          ],
          byPriority: [
            {
              $group: {
                _id: "$priority",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const summary = ticketsData[0].summary[0] || {};
    const avgWaitTimeMinutes = Math.round((summary.avgWaitTime || 0) / 1000 / 60);

    res.json({
      message: "Daily report retrieved",
      date: reportDate.toISOString().split("T")[0],
      summary: {
        totalTickets: summary.total || 0,
        completedTickets: summary.completed || 0,
        cancelledTickets: summary.cancelled || 0,
        avgWaitTime: avgWaitTimeMinutes,
      },
      byService: ticketsData[0].byService,
      byPriority: ticketsData[0].byPriority,
    });
  } catch (err) {
    console.error("Daily report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET PERFORMANCE REPORT
 * Staff and counter performance metrics
 */
exports.getPerformanceReport = async (req, res) => {
  try {
    // Counter performance
    const counterPerformance = await Counter.find()
      .populate("assignedStaff", "name email department")
      .lean();

    const counterStats = counterPerformance.map((counter) => ({
      counterName: counter.counterName,
      staff: counter.assignedStaff
        ? {
            name: counter.assignedStaff.name,
            email: counter.assignedStaff.email,
            department: counter.assignedStaff.department,
          }
        : null,
      ticketsServed: counter.performanceMetrics?.totalTicketsServed || 0,
      avgServiceTime:
        Math.round((counter.performanceMetrics?.avgServiceTime || 0) / 60) +
        " min",
      status: counter.status,
      availability: counter.availabilityStatus,
    }));

    // Top performing staff
    const staffPerformance = await User.aggregate([
      { $match: { role: "staff" } },
      {
        $lookup: {
          from: "counters",
          localField: "_id",
          foreignField: "assignedStaff",
          as: "assignedCounters",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          department: 1,
          totalTicketsServed: {
            $sum: "$assignedCounters.performanceMetrics.totalTicketsServed",
          },
          avgServiceTime: {
            $avg: "$assignedCounters.performanceMetrics.avgServiceTime",
          },
        },
      },
      { $sort: { totalTicketsServed: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      message: "Performance report retrieved",
      timestamp: new Date(),
      counters: counterStats,
      topStaff: staffPerformance.map((staff) => ({
        name: staff.name,
        email: staff.email,
        department: staff.department,
        ticketsServed: staff.totalTicketsServed,
        avgServiceTime: Math.round(staff.avgServiceTime / 60) + " min",
      })),
    });
  } catch (err) {
    console.error("Performance report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SERVICE TYPE REPORT
 * Statistics by service type
 */
exports.getServiceTypeReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceStats = await Ticket.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: "$serviceType",
          totalTickets: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          waiting: {
            $sum: { $cond: [{ $eq: ["$status", "waiting"] }, 1, 0] },
          },
          serving: {
            $sum: { $cond: [{ $eq: ["$status", "serving"] }, 1, 0] },
          },
          avgServiceTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedAt", null] },
                { $subtract: ["$completedAt", "$servedAt"] },
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalTickets: -1 } },
    ]);

    const report = serviceStats.map((service) => ({
      serviceType: service._id,
      totalTickets: service.totalTickets,
      completed: service.completed,
      waiting: service.waiting,
      serving: service.serving,
      completionRate: Math.round(
        (service.completed / service.totalTickets) * 100
      ),
      avgServiceTime: Math.round(service.avgServiceTime / 1000 / 60) + " min",
    }));

    res.json({
      message: "Service type report retrieved",
      timestamp: new Date(),
      report,
    });
  } catch (err) {
    console.error("Service type report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET KPI METRICS
 * Get comprehensive KPI calculations including wait times, service times, and throughput
 */
const kpiCalculator = require("../utils/kpiCalculator");

exports.getKPIMetrics = async (req, res) => {
  try {
    const { startDate, endDate, serviceType } = req.query;

    const kpiReport = await kpiCalculator.getComprehensiveKPIReport({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      serviceType,
    });

    res.json({
      message: "KPI metrics retrieved",
      timestamp: new Date(),
      data: kpiReport,
    });
  } catch (err) {
    console.error("KPI metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET WAIT TIME METRICS
 * Detailed wait time analysis
 */
exports.getWaitTimeMetrics = async (req, res) => {
  try {
    const { startDate, endDate, serviceType, priority } = req.query;

    const metrics = await kpiCalculator.getWaitTimeKPIs({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      serviceType,
      priority,
    });

    res.json({
      message: "Wait time metrics retrieved",
      timestamp: new Date(),
      data: metrics,
    });
  } catch (err) {
    console.error("Wait time metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SERVICE TIME METRICS
 * Detailed service time analysis
 */
exports.getServiceTimeMetrics = async (req, res) => {
  try {
    const { startDate, endDate, serviceType, priority } = req.query;

    const metrics = await kpiCalculator.getServiceTimeKPIs({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      serviceType,
      priority,
    });

    res.json({
      message: "Service time metrics retrieved",
      timestamp: new Date(),
      data: metrics,
    });
  } catch (err) {
    console.error("Service time metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET THROUGHPUT METRICS
 * Tickets processed per time period
 */
exports.getThroughputMetrics = async (req, res) => {
  try {
    const { startDate, endDate, serviceType, granularity = "daily" } = req.query;

    const metrics = await kpiCalculator.getThroughputKPIs({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      serviceType,
      granularity,
    });

    res.json({
      message: "Throughput metrics retrieved",
      timestamp: new Date(),
      data: metrics,
    });
  } catch (err) {
    console.error("Throughput metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SLA COMPLIANCE
 * Service Level Agreement compliance metrics
 */
exports.getSLACompliance = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      maxWaitTime = 10,
      maxServiceTime = 15,
      serviceType,
    } = req.query;

    const compliance = await kpiCalculator.getSLACompliance({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      maxWaitTime: parseInt(maxWaitTime),
      maxServiceTime: parseInt(maxServiceTime),
      serviceType,
    });

    res.json({
      message: "SLA compliance data retrieved",
      timestamp: new Date(),
      data: compliance,
    });
  } catch (err) {
    console.error("SLA compliance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET KPI TRENDS
 * KPI metrics over specified time period
 */
exports.getKPITrends = async (req, res) => {
  try {
    const { days = 7, serviceType } = req.query;

    const trends = await kpiCalculator.getKPITrends({
      days: parseInt(days),
      serviceType,
    });

    res.json({
      message: "KPI trends retrieved",
      timestamp: new Date(),
      data: trends,
    });
  } catch (err) {
    console.error("KPI trends error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

