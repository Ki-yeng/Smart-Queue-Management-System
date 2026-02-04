// routes/clearanceRoutes.js
const express = require("express");
const router = express.Router();

/**
 * =========================================
 * 🟢 STEP 1: CLEARANCE STATUS (ROOT CAUSE)
 * -----------------------------------------
 * This is a MOCK clearance source.
 * No blocking, no routing, no enforcement.
 * Visibility ONLY.
 * =========================================
 */

// Minimal example - replace this with your DB model
// For now, using an in-memory "database"
const mockClearanceDB = {
  "6948009e873645fc85d47db6": {
    finance: {
      status: "PENDING", // 🔹 standardized
      message: "Outstanding fee balance detected",
    },
    academics: {
      status: "REGISTERED",
      message: "All required units registered",
    },
    examinations: {
      status: "BLOCKED",
      message: "Exam access blocked due to pending fees",
    },
    library: {
      status: "CLEARED",
      message: "No pending library books",
    },
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
      return res.status(404).json({
        message: "Clearance not found",
      });
    }

    /**
     * IMPORTANT:
     * This endpoint ONLY RETURNS STATUS
     * No business logic, no blocking, no routing
     */
    res.json(clearance);
  } catch (err) {
    console.error("Clearance fetch error:", err.message);
    res.status(500).json({
      message: "Server error fetching clearance",
    });
  }
});

module.exports = router;
