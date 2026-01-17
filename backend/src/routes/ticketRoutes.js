// backend/src/routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const {
  createTicket,
  getNextTicket,
  serveTicket,
  completeTicket,
  cancelTicket,
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

// ===== PROTECTED ROUTES (Staff & Admin Only) =====

// Get all tickets for staff dashboard (staff/admin only)
router.get("/", protect, staffOnly, getAllTickets);

// Get waiting tickets with optional service type filter (staff/admin only)
router.get("/waiting", protect, staffOnly, getWaitingTickets);

// Get ticket by ID (staff/admin only)
router.get("/:id", protect, staffOnly, getTicketById);

// Serve ticket (staff/admin only)
router.put("/serve/:id", protect, staffOnly, serveTicket);

// Complete ticket (staff/admin only)
router.put("/complete/:id", protect, staffOnly, completeTicket);

// Cancel ticket (staff/admin only)
router.put("/cancel/:id", protect, staffOnly, cancelTicket);

module.exports = router;
