// backend/src/routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const {
  createTicket,
  getNextTicket,
  serveTicket,
  completeTicket,
  cancelTicket,
  transferTicket,
  updateTicketPriority,
  markAsVIP,
  markAccessibilityNeeds,
  getPriorityQueueSummary,
  getAllTickets,
  getWaitingTickets,
  getTicketById,
} = require("../controllers/ticketController");

// Auth middleware
const { protect, staffOnly, allowRoles } = require("../middleware/authMiddleware");

// ===== PUBLIC ROUTES =====
// Create a new ticket (students/customers)
router.post("/create", createTicket);

// Get next waiting ticket by service type (public info)
router.get("/next/:serviceType", getNextTicket);

// Get public waiting tickets list with optional service type filter
router.get("/list/waiting", getWaitingTickets);

// ===== PROTECTED ROUTES (Staff & Admin Only) =====
// NOTE: More specific routes (with suffixes) must come BEFORE generic :id routes

// Get all tickets for staff dashboard with filtering (backward compatible)
router.get("/", protect, staffOnly, getAllTickets);

// Get all tickets (alternative route)
router.get("/all", protect, staffOnly, getAllTickets);

// Get priority queue summary
router.get("/summary/priority", protect, staffOnly, getPriorityQueueSummary);

// Get waiting tickets with optional service type filter (staff/admin only)
router.get("/waiting", protect, staffOnly, getWaitingTickets);

// Serve ticket (staff/admin only)
router.put("/serve/:id", protect, staffOnly, serveTicket);

// Complete ticket (staff/admin only)
router.put("/complete/:id", protect, staffOnly, completeTicket);

// Cancel ticket (staff/admin only)
router.put("/cancel/:id", protect, staffOnly, cancelTicket);

// Transfer/Reassign ticket to a different counter (staff/admin only)
router.put("/transfer/:id", protect, staffOnly, transferTicket);

// Update ticket priority (staff/admin only)
router.put("/priority/:id", protect, staffOnly, updateTicketPriority);

// Mark ticket as VIP (staff/admin only)
router.put("/vip/:id", protect, staffOnly, markAsVIP);

// Mark ticket with accessibility needs (staff/admin only)
router.put("/accessibility/:id", protect, staffOnly, markAccessibilityNeeds);

// Get ticket by ID (staff/admin only) - MUST BE LAST
router.get("/:id", protect, staffOnly, getTicketById);

module.exports = router;
