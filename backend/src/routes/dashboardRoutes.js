const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getQuickStats,
  getDailyReport,
  getPerformanceReport,
  getServiceTypeReport,
  getKPIMetrics,
  getWaitTimeMetrics,
  getServiceTimeMetrics,
  getThroughputMetrics,
  getSLACompliance,
  getKPITrends,
} = require("../controllers/dashboardController");
const { protect, adminOnly, staffOnly } = require("../middleware/authMiddleware");

/**
 * Middleware to ensure staff or admin role
 */
const requireStaffOrAdmin = (req, res, next) => {
  if (req.user.role !== "staff" && req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({
      message: "Access denied. Staff or admin role required",
      requiredRole: "staff or admin",
    });
  }
  next();
};

/**
 * GET /api/dashboard
 * Get comprehensive dashboard statistics (staff and admin only)
 * Includes tickets, counters, staff, metrics, and system health
 */
router.get("/", protect, requireStaffOrAdmin, getDashboardStats);

/**
 * GET /api/dashboard/quick-stats
 * Get lightweight quick stats for frequent updates
 * Minimal data for performance
 */
router.get("/quick-stats", protect, getQuickStats);

/**
 * GET /api/dashboard/daily-report
 * Get daily report for specific date
 * Query params: date (optional, YYYY-MM-DD format)
 */
router.get("/daily-report", protect, requireStaffOrAdmin, getDailyReport);

/**
 * GET /api/dashboard/performance
 * Get staff and counter performance metrics
 * Includes top performing staff and counter efficiency
 */
router.get("/performance", protect, requireStaffOrAdmin, getPerformanceReport);

/**
 * GET /api/dashboard/services
 * Get service type breakdown and statistics
 * Includes completion rates and average times per service
 */
router.get("/services", protect, requireStaffOrAdmin, getServiceTypeReport);

/**
 * GET /api/dashboard/kpis
 * Get comprehensive KPI metrics
 * Includes wait times, service times, throughput, and SLA compliance
 * Query params: startDate, endDate, serviceType (all optional)
 */
router.get("/kpis", protect, requireStaffOrAdmin, getKPIMetrics);

/**
 * GET /api/dashboard/kpis/wait-time
 * Get detailed wait time KPIs
 * Query params: startDate, endDate, serviceType, priority (all optional)
 */
router.get("/kpis/wait-time", protect, requireStaffOrAdmin, getWaitTimeMetrics);

/**
 * GET /api/dashboard/kpis/service-time
 * Get detailed service time KPIs
 * Query params: startDate, endDate, serviceType, priority (all optional)
 */
router.get("/kpis/service-time", protect, requireStaffOrAdmin, getServiceTimeMetrics);

/**
 * GET /api/dashboard/kpis/throughput
 * Get throughput KPIs (tickets processed per time period)
 * Query params: startDate, endDate, serviceType, granularity (all optional)
 */
router.get("/kpis/throughput", protect, requireStaffOrAdmin, getThroughputMetrics);

/**
 * GET /api/dashboard/kpis/sla
 * Get SLA compliance metrics
 * Query params: startDate, endDate, maxWaitTime, maxServiceTime, serviceType (all optional)
 */
router.get("/kpis/sla", protect, requireStaffOrAdmin, getSLACompliance);

/**
 * GET /api/dashboard/kpis/trends
 * Get KPI trends over specified time period
 * Query params: days (default 7), serviceType (optional)
 */
router.get("/kpis/trends", protect, requireStaffOrAdmin, getKPITrends);

module.exports = router;

