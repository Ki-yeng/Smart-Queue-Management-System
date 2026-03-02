const express = require("express");
const {
  getTicketsPerDay,
  getDepartmentStats,
  getAverageWaitTime,
  getStaffPerformance,
  getHourlyPeak,
  getOperationalMetrics,
} = require("../controllers/adminDashboardController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/tickets-per-day", getTicketsPerDay);
router.get("/department-stats", getDepartmentStats);
router.get("/average-wait-time", getAverageWaitTime);
router.get("/staff-performance", getStaffPerformance);
router.get("/hourly-peak", getHourlyPeak);
router.get("/operational-metrics", getOperationalMetrics);

module.exports = router;
