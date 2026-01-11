// backend/src/routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const {
  createTicket,
  getNextTicket,
  serveTicket,
  completeTicket,
  cancelTicket,
  getAllTickets, // for staff dashboard
} = require("../controllers/ticketController");

// Protect middleware (optional: only staff/admin)
const { protect } = require("../middleware/authMiddleware");

// Create a new ticket (student)
router.post("/create", createTicket);

// Get next waiting ticket by service type
router.get("/next/:serviceType", getNextTicket);

// Get all tickets for staff dashboard
router.get("/", protect, getAllTickets);

// Serve, complete, cancel ticket
router.put("/serve/:id", protect, serveTicket);
router.put("/complete/:id", protect, completeTicket);
router.put("/cancel/:id", protect, cancelTicket);

module.exports = router;
