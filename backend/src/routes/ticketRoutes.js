// backend/src/routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");

// Create a new ticket (student)
router.post("/", ticketController.createTicket);

// Get all tickets (with optional filters)
router.get("/", ticketController.getAllTickets);

// Get waiting tickets (optional serviceType filter)
router.get("/waiting", ticketController.getWaitingTickets);

// Get next ticket for a service type
router.get("/next/:serviceType", ticketController.getNextTicket);

// Get ticket by ID
router.get("/:id", ticketController.getTicketById);

// Serve ticket
router.put("/serve/:id", ticketController.serveTicket);

// Complete ticket
router.put("/complete/:id", ticketController.completeTicket);

// Cancel ticket
router.put("/cancel/:id", ticketController.cancelTicket);

// Transfer ticket to another counter
router.put("/transfer/:id", ticketController.transferTicket);

// Update ticket priority
router.put("/priority/:id", ticketController.updateTicketPriority);

// Mark ticket as VIP
router.put("/vip/:id", ticketController.markAsVIP);

// Mark ticket as requiring accessibility accommodation
router.put("/accessibility/:id", ticketController.markAccessibilityNeeds);

// Priority queue summary
router.get("/summary/priority", ticketController.getPriorityQueueSummary);

module.exports = router;
