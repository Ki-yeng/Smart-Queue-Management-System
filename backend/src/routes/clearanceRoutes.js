const express = require("express");
const router = express.Router();
const Clearance = require("../models/Clearance");
const { protect, allowRoles } = require("../middleware/authMiddleware");

const buildContext = (doc) => {
  const empty = {
    finance: { status: "", note: "" },
    academics: { status: "", note: "" },
    examinations: { status: "", note: "" },
    library: { status: "", note: "" },
  };
  if (!doc) return empty;
  return {
    finance: { status: doc.finance?.status || "", note: doc.finance?.note || "" },
    academics: { status: doc.academics?.status || "", note: doc.academics?.note || "" },
    examinations: { status: doc.examinations?.status || "", note: doc.examinations?.note || "" },
    library: { status: doc.library?.status || "", note: doc.library?.note || "" },
  };
};

// GET /api/clearance/:userId
router.get("/:userId", protect, async (req, res) => {
  const { userId } = req.params;
  const isOwner = req.user?._id?.toString() === userId;
  const isStaff = ["staff", "admin"].includes(req.user?.role);

  if (!isOwner && !isStaff) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const doc = await Clearance.findOne({ userId }).lean();
    res.json(buildContext(doc));
  } catch (err) {
    console.error("Clearance fetch error:", err.message);
    res.status(500).json({ message: "Server error fetching clearance" });
  }
});

// PUT /api/clearance/:userId (staff/admin)
router.put("/:userId", protect, allowRoles("staff", "admin"), async (req, res) => {
  const { userId } = req.params;
  const { finance, academics, examinations, library } = req.body || {};

  try {
    const doc = await Clearance.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(finance ? { finance } : {}),
          ...(academics ? { academics } : {}),
          ...(examinations ? { examinations } : {}),
          ...(library ? { library } : {}),
        },
      },
      { new: true, upsert: true }
    ).lean();

    res.json(buildContext(doc));
  } catch (err) {
    console.error("Clearance update error:", err.message);
    res.status(500).json({ message: "Server error updating clearance" });
  }
});

module.exports = router;
