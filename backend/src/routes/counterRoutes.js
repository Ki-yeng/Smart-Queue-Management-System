const express = require("express");
const router = express.Router();
const Counter = require("../models/Counter");
const Ticket = require("../models/Ticket");
const { protect, adminOnly, staffOnly } = require("../middleware/authMiddleware");

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

// ===== PUBLIC ROUTES =====

// Get all counters (anyone can view)
router.get("/", async (req, res) => {
  try {
    const counters = await Counter.find().populate("currentTicket", "ticketNumber");
    res.json(counters);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
