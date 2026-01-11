const express = require("express");
const router = express.Router();
const Counter = require("../models/Counter");
const Ticket = require("../models/Ticket");

// Create a counter
router.post("/", async (req, res) => {
  try {
    const counter = await Counter.create(req.body);
    res.status(201).json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign service types
router.put("/:id/services", async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      { serviceType: req.body.serviceType },
      { new: true }
    );
    res.json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Open/close counter
// Open / close / busy counter (validated)
router.put("/:id/status", async (req, res) => {
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

    res.json(counter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// Track current ticket
router.get("/:id/current", async (req, res) => {
  try {
    const counter = await Counter.findById(req.params.id).populate("currentTicket");
    res.json(counter.currentTicket || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
