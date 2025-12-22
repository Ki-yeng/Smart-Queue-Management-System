const Counter = require("../models/Counter");

/**
 * CREATE COUNTER
 * POST /api/counters
 */
exports.createCounter = async (req, res) => {
  try {
    const { name, serviceType } = req.body;

    if (!name || !serviceType) {
      return res
        .status(400)
        .json({ message: "name and serviceType are required" });
    }

    const counter = await Counter.create({ name, serviceType });

    res.status(201).json({
      message: "Counter created successfully",
      counter,
    });
  } catch (error) {
    console.error("Create counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * OPEN COUNTER
 * PUT /api/counters/open/:id
 */
exports.openCounter = async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      { status: "open" },
      { new: true }
    );

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      message: "Counter opened",
      counter,
    });
  } catch (error) {
    console.error("Open counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CLOSE COUNTER
 * PUT /api/counters/close/:id
 */
exports.closeCounter = async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      req.params.id,
      {
        status: "closed",
        currentTicket: null,
      },
      { new: true }
    );

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({
      message: "Counter closed",
      counter,
    });
  } catch (error) {
    console.error("Close counter error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL COUNTERS + CURRENT TICKET
 * GET /api/counters
 */
exports.getAllCounters = async (req, res) => {
  try {
    const counters = await Counter.find().populate("currentTicket");

    res.json(counters);
  } catch (error) {
    console.error("Get counters error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
