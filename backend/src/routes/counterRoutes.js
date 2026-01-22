const express = require("express");
const router = express.Router();
const Counter = require("../models/Counter");
const Ticket = require("../models/Ticket");
const { protect, adminOnly, staffOnly } = require("../middleware/authMiddleware");
const {
  assignStaffToCounter,
  unassignStaffFromCounter,
  getAssignmentHistory,
  getCounterStaffAssignments,
  getCountersByStaff,
  getAllCounters,
  updateAvailabilityStatus,
  getAvailabilityStatus,
  getAvailableCounters,
  setCounterMaintenance,
  resumeCounter,
  getAvailabilityStats,
  getLoadBalancingDashboard,
  getCountersByLoad,
  getBestCounterForTicket,
  getLoadRebalancingSuggestions,
  getAllCountersWithStatus,
  getCounterStatus,
  getCounterMetricsById,
  getAllCountersMetrics,
  getCounterPerformanceComparison,
  getMetricsDashboardSummary,
} = require("../controllers/counterController");

// ===== ADMIN ONLY ROUTES =====

// Create a counter (admin only)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const counter = await Counter.create(req.body);
    console.log(`✅ Counter created: ${counter.counterName}`);
    res.status(201).json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign service types (admin only)
router.put("/:id/services", protect, adminOnly, async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      { serviceType: req.body.serviceType },
      { new: true }
    );
    console.log(`✅ Counter services updated: ${req.params.id}`);
    res.json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== STAFF & ADMIN ROUTES =====

// Update counter status (staff/admin)
router.put("/:id/status", protect, staffOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "closed", "busy"].includes(status)) {
      return res.status(400).json({ message: "Invalid counter status" });
    }

    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    console.log(`✅ Counter status updated: ${counter.counterName} -> ${status}`);
    res.json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get current ticket at counter (staff/admin)
router.get("/:id/current", protect, staffOnly, async (req, res) => {
  try {
    const counter = await Counter.findById(req.params.id).populate("currentTicket");
    res.json(counter.currentTicket || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ===== STAFF ASSIGNMENT ROUTES (ADMIN ONLY) =====

// Get all counters with staff assignments (admin only)
router.get("/assignments/all", protect, adminOnly, getCounterStaffAssignments);

// Get assignment history for a counter (admin only)
router.get("/:id/assignment-history", protect, adminOnly, getAssignmentHistory);

// Assign staff to counter (admin only)
router.put("/:id/assign-staff", protect, adminOnly, assignStaffToCounter);

// Unassign staff from counter (admin only)
router.put("/:id/unassign-staff", protect, adminOnly, unassignStaffFromCounter);

// Get counters assigned to a staff member (admin only)
router.get("/by-staff/:staffId", protect, adminOnly, getCountersByStaff);

// ===== AVAILABILITY TRACKING ROUTES (ADMIN ONLY) =====

// Get availability statistics
router.get("/stats/availability", protect, adminOnly, getAvailabilityStats);

// Update counter availability status
router.put("/:id/availability", protect, adminOnly, updateAvailabilityStatus);

// Get counter availability status
router.get("/:id/availability", protect, adminOnly, getAvailabilityStatus);

// Set counter for maintenance
router.put("/:id/maintenance", protect, adminOnly, setCounterMaintenance);

// Resume counter from maintenance/break
router.put("/:id/resume", protect, adminOnly, resumeCounter);

// ===== LOAD BALANCING ROUTES (STAFF & ADMIN) =====

// Get load balancing dashboard with real-time metrics
router.get("/load-balancing/dashboard", protect, staffOnly, getLoadBalancingDashboard);

// Get counters sorted by current load
router.get("/load-balancing/by-load", protect, staffOnly, getCountersByLoad);

// Get best counter recommendation for a ticket
router.get("/load-balancing/best-counter", protect, staffOnly, getBestCounterForTicket);

// Get load rebalancing suggestions
router.get("/load-balancing/suggestions", protect, adminOnly, getLoadRebalancingSuggestions);

// ===== COUNTER STATUS ROUTES (STAFF & ADMIN) =====

// Get all counters with their current status (staff/admin)
router.get("/status/all", protect, staffOnly, getAllCountersWithStatus);

// Get specific counter status by ID (staff/admin)
router.get("/status/:id", protect, staffOnly, getCounterStatus);

// ===== COUNTER METRICS ROUTES (STAFF & ADMIN) =====

// Get metrics dashboard summary (staff/admin)
router.get("/metrics/summary", protect, staffOnly, getMetricsDashboardSummary);

// Get all counters metrics (staff/admin)
router.get("/metrics/all", protect, staffOnly, getAllCountersMetrics);

// Get counter performance comparison (staff/admin)
router.get("/metrics/comparison", protect, staffOnly, getCounterPerformanceComparison);

// Get specific counter metrics by ID (staff/admin)
router.get("/metrics/:id", protect, staffOnly, getCounterMetricsById);

// ===== PUBLIC ROUTES =====

// Get available counters (public)
router.get("/available", getAvailableCounters);

// Get all counters (anyone can view)
router.get("/", async (req, res) => {
  try {
    const counters = await Counter.find()
      .populate("currentTicket", "ticketNumber")
      .populate("assignedStaff", "name email");
    res.json(counters);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
