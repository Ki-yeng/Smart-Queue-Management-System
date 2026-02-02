// routes/clearanceRoutes.js
const express = require("express");
const router = express.Router();

// Minimal example - replace this with your DB model
// For now, using an in-memory "database"
const mockClearanceDB = {
  "6948009e873645fc85d47db6": {
    finance: { status: "Paid" },
    academics: { status: "Registered" },
    examinations: { status: "Eligible" },
    library: { status: "Cleared" },
  },
  // Add other student IDs here as needed
};

// GET /api/clearance/:userId
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Replace this with actual DB query in future
    const clearance = mockClearanceDB[userId];

    if (!clearance) {
      return res.status(404).json({ message: "Clearance not found" });
    }

    res.json(clearance);
  } catch (err) {
    console.error("Clearance fetch error:", err.message);
    res.status(500).json({ message: "Server error fetching clearance" });
  }
});

module.exports = router;
