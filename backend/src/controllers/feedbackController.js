const Feedback = require("../models/Feedback");
const Ticket = require("../models/Ticket");

const canManageFeedback = (role) => ["staff", "admin"].includes(role);

const parseLimit = (value, fallback = 50) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), 200);
};

exports.createFeedback = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { type = "feedback", rating = null, category = "general", message, priority = "medium", ticketId = null } = req.body || {};

    if (!["feedback", "complaint"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Use feedback or complaint." });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required." });
    }
    if (type === "feedback" && (rating == null || Number(rating) < 1 || Number(rating) > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5 for feedback." });
    }
    if (type === "complaint" && !["low", "medium", "high", "urgent"].includes(priority)) {
      return res.status(400).json({ message: "Invalid complaint priority." });
    }

    let linkedTicket = null;
    if (ticketId) {
      linkedTicket = await Ticket.findById(ticketId).select("_id userId status serviceType");
      if (!linkedTicket) return res.status(404).json({ message: "Ticket not found." });
      if (String(linkedTicket.userId) !== String(userId) && !canManageFeedback(req.user?.role)) {
        return res.status(403).json({ message: "You can only submit feedback for your own ticket." });
      }
      if (linkedTicket.status !== "completed") {
        return res.status(400).json({ message: "Feedback/complaint can only be linked to completed tickets." });
      }
    }

    const initialStatus = type === "complaint" ? "open" : "submitted";

    const doc = await Feedback.create({
      type,
      rating: type === "feedback" ? Number(rating) : null,
      category,
      message: String(message).trim(),
      status: initialStatus,
      priority: type === "complaint" ? priority : "medium",
      userId,
      ticketId: linkedTicket?._id || null,
      serviceType: linkedTicket?.serviceType || "",
      lifecycleHistory: [
        {
          status: initialStatus,
          note: "Created",
          updatedBy: userId,
          updatedAt: new Date(),
        },
      ],
    });

    res.status(201).json({ message: "Feedback submitted", data: doc });
  } catch (err) {
    console.error("createFeedback error:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};

exports.getMyFeedback = async (req, res) => {
  try {
    const docs = await Feedback.find({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(parseLimit(req.query.limit, 100))
      .populate("ticketId", "ticketNumber serviceType status")
      .lean();
    res.json({ data: docs });
  } catch (err) {
    console.error("getMyFeedback error:", err);
    res.status(500).json({ message: "Failed to load feedback" });
  }
};

exports.getFeedbackQueue = async (req, res) => {
  try {
    if (!canManageFeedback(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { type, status, priority, category, assignedTo, serviceType } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (serviceType) query.serviceType = serviceType;

    const docs = await Feedback.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(parseLimit(req.query.limit, 100))
      .populate("userId", "name email")
      .populate("ticketId", "ticketNumber serviceType status")
      .populate("assignedTo", "name email")
      .lean();

    res.json({ data: docs });
  } catch (err) {
    console.error("getFeedbackQueue error:", err);
    res.status(500).json({ message: "Failed to load feedback queue" });
  }
};

exports.updateFeedbackStatus = async (req, res) => {
  try {
    if (!canManageFeedback(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { status, note = "", resolutionNote = "" } = req.body || {};
    const allowed = ["submitted", "open", "in_review", "resolved", "closed", "rejected"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ message: "Feedback item not found." });

    doc.status = status;
    if (resolutionNote) doc.resolutionNote = String(resolutionNote).trim();
    if (status === "resolved" || status === "closed") doc.resolvedAt = new Date();
    doc.lifecycleHistory.unshift({
      status,
      note: String(note || resolutionNote || "").trim(),
      updatedBy: req.user?._id,
      updatedAt: new Date(),
    });
    doc.lifecycleHistory = doc.lifecycleHistory.slice(0, 100);

    await doc.save();
    res.json({ message: "Status updated", data: doc });
  } catch (err) {
    console.error("updateFeedbackStatus error:", err);
    res.status(500).json({ message: "Failed to update feedback status" });
  }
};

exports.assignFeedback = async (req, res) => {
  try {
    if (!canManageFeedback(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { assignedTo, note = "" } = req.body || {};
    const doc = await Feedback.findById(id);
    if (!doc) return res.status(404).json({ message: "Feedback item not found." });

    doc.assignedTo = assignedTo || null;
    doc.lifecycleHistory.unshift({
      status: doc.status,
      note: note || (assignedTo ? "Assigned to handler" : "Unassigned"),
      updatedBy: req.user?._id,
      updatedAt: new Date(),
    });
    doc.lifecycleHistory = doc.lifecycleHistory.slice(0, 100);

    await doc.save();
    res.json({ message: "Assignment updated", data: doc });
  } catch (err) {
    console.error("assignFeedback error:", err);
    res.status(500).json({ message: "Failed to assign feedback" });
  }
};

exports.getFeedbackSummary = async (req, res) => {
  try {
    if (!canManageFeedback(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [byType, byStatus, avgRating] = await Promise.all([
      Feedback.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Feedback.aggregate([
        { $match: { type: "feedback", rating: { $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, total: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      data: {
        byType,
        byStatus,
        avgRating: avgRating[0]?.avgRating || 0,
        totalRatings: avgRating[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error("getFeedbackSummary error:", err);
    res.status(500).json({ message: "Failed to load feedback summary" });
  }
};

