const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
} = require("../controllers/dashboardController");
const { protect, adminOnly, staffOnly } = require("../middleware/authMiddleware");

/**
 * GET /api/dashboard
 * Get dashboard statistics (staff and admin only)
 * Admins see full system stats, staff see their counter stats
 */
router.get("/", protect, (req, res, next) => {
  // Allow both staff and admin, but with different data
  if (req.user.role !== "staff" && req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Staff or admin role required",
      requiredRole: "staff or admin",
    });
  }
  next();
}, getDashboardStats);

module.exports = router;
