// backend/src/routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { protect, staffOnly, customerOrStaff } = require("../middleware/authMiddleware");

// Create a new ticket (student)
router.post("/", ticketController.createTicket);

//  ADD: Get latest ticket for a student
router.get("/latest/:userId", ticketController.getLatestTicket);

// Get all tickets (with optional filters)
router.get("/", ticketController.getAllTickets);

// Get waiting tickets (optional serviceType filter)
router.get("/waiting", protect, staffOnly, ticketController.getWaitingTickets);

// Central queue overview (aggregated)
router.get("/queue-overview", ticketController.getQueueOverview);

// Get next ticket for a service type
router.get("/next/:serviceType", ticketController.getNextTicket);

// Get ticket by ID
router.get("/:id", ticketController.getTicketById);

// Virtual queue check-in
router.put("/check-in/:id", protect, customerOrStaff, ticketController.checkInTicket);

// Serve ticket
router.put("/serve/:id", protect, staffOnly, ticketController.serveTicket);

// Complete ticket
router.put("/complete/:id", protect, staffOnly, ticketController.completeTicket);

// Put ticket on hold
router.put("/hold/:id", protect, staffOnly, ticketController.holdTicket);

// Cancel ticket
router.put("/cancel/:id", ticketController.cancelTicket);

// Transfer ticket to another counter
router.put("/transfer/:id", protect, staffOnly, ticketController.transferTicket);

// Staff action (workflow updates)
router.post("/staff-action", protect, staffOnly, ticketController.staffAction);

// Update ticket priority
router.put("/priority/:id", protect, staffOnly, ticketController.updateTicketPriority);

// Mark ticket as VIP
router.put("/vip/:id", protect, staffOnly, ticketController.markAsVIP);

// Mark ticket as requiring accessibility accommodation
router.put("/accessibility/:id", protect, staffOnly, ticketController.markAccessibilityNeeds);

// Priority queue summary
router.get("/summary/priority", protect, staffOnly, ticketController.getPriorityQueueSummary);

module.exports = router;
