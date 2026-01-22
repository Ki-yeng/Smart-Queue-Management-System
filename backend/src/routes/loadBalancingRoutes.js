/**
 * Load Balancing Routes
 * Real-time counter load balancing endpoints
 */

const express = require("express");
const router = express.Router();
const {
  getSystemLoadStatus,
  getServiceLoadStatus,
  getBestCounterForTicket,
  getLoadRecommendations,
  autoAssignTicket,
  rebalanceService,
  getOptimizationInsights,
  getCountersSortedByLoad,
} = require("../controllers/loadBalancingController");

const { protect, staffOnly, adminOnly } = require("../middleware/authMiddleware");

/**
 * PUBLIC ENDPOINTS (No authentication required)
 */

// Get overall system load status (useful for frontend dashboards)
router.get("/status", getSystemLoadStatus);

// Get best counter for a specific ticket
router.get("/best-counter", getBestCounterForTicket);

// Get counters sorted by load for a service
router.get("/counters-by-load", getCountersSortedByLoad);

/**
 * STAFF ENDPOINTS (Staff + Admin only)
 */

// Get load status for a specific service
router.get("/service/:serviceType", staffOnly, getServiceLoadStatus);

// Get load rebalancing recommendations
router.get("/recommendations", staffOnly, getLoadRecommendations);

/**
 * ADMIN ENDPOINTS (Admin only)
 */

// Auto-assign next waiting ticket to optimal counter
router.post("/auto-assign", adminOnly, autoAssignTicket);

// Manually trigger queue rebalancing for a service
router.post("/rebalance/:serviceType", adminOnly, rebalanceService);

// Get detailed optimization insights
router.get("/insights", adminOnly, getOptimizationInsights);

module.exports = router;
