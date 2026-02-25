const Ticket = require("../models/Ticket");

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.getTicketsPerDay = async (req, res) => {
  try {
    const today = getStartOfDay(new Date());
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29);

    const aggregated = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            day: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
          },
          totalTickets: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    const map = new Map(aggregated.map((row) => [row._id.day, row.totalTickets]));
    const series = [];
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const day = date.toISOString().slice(0, 10);
      series.push({ day, totalTickets: map.get(day) || 0 });
    }

    res.json({ rangeDays: 30, startDate, endDate: today, data: series });
  } catch (err) {
    console.error("getTicketsPerDay error:", err);
    res.status(500).json({ message: "Failed to load tickets per day" });
  }
};

exports.getDepartmentStats = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      {
        $addFields: {
          departmentSafe: { $ifNull: ["$department", "$serviceType"] },
        },
      },
      {
        $group: {
          _id: "$departmentSafe",
          total: { $sum: 1 },
          waiting: { $sum: { $cond: [{ $eq: ["$status", "waiting"] }, 1, 0] } },
          serving: { $sum: { $cond: [{ $eq: ["$status", "serving"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
      { $sort: { total: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          department: "$_id",
          total: 1,
          waiting: 1,
          serving: 1,
          completed: 1,
          pending: { $add: ["$waiting", "$serving"] },
        },
      },
    ]);

    res.json({ data });
  } catch (err) {
    console.error("getDepartmentStats error:", err);
    res.status(500).json({ message: "Failed to load department stats" });
  }
};

exports.getAverageWaitTime = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      {
        $addFields: {
          departmentSafe: { $ifNull: ["$department", "$serviceType"] },
          completedAtSafe: { $ifNull: ["$completedAt", "$serviceEndTime"] },
        },
      },
      {
        $match: {
          status: "completed",
          completedAtSafe: { $ne: null },
          createdAt: { $ne: null },
          departmentSafe: { $ne: null },
        },
      },
      {
        $project: {
          department: "$departmentSafe",
          waitMinutes: {
            $divide: [{ $subtract: ["$completedAtSafe", "$createdAt"] }, 1000 * 60],
          },
        },
      },
      {
        $match: {
          waitMinutes: { $gte: 0, $lte: 1440 },
        },
      },
      {
        $group: {
          _id: "$department",
          avgWaitMinutes: { $avg: "$waitMinutes" },
          samples: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          department: "$_id",
          avgWaitMinutes: { $round: ["$avgWaitMinutes", 2] },
          samples: 1,
        },
      },
    ]);

    res.json({ data });
  } catch (err) {
    console.error("getAverageWaitTime error:", err);
    res.status(500).json({ message: "Failed to load average wait time" });
  }
};

exports.getStaffPerformance = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      {
        $addFields: {
          serviceStartSafe: { $ifNull: ["$serviceStartTime", "$servedAt"] },
          serviceEndSafe: { $ifNull: ["$serviceEndTime", "$completedAt"] },
        },
      },
      {
        $match: {
          servedBy: { $ne: null },
          serviceStartSafe: { $ne: null },
          serviceEndSafe: { $ne: null },
        },
      },
      {
        $project: {
          servedBy: 1,
          serviceMinutes: {
            $divide: [{ $subtract: ["$serviceEndSafe", "$serviceStartSafe"] }, 1000 * 60],
          },
        },
      },
      {
        $match: {
          serviceMinutes: { $gte: 0, $lte: 1440 },
        },
      },
      {
        $group: {
          _id: "$servedBy",
          ticketsServed: { $sum: 1 },
          avgServiceMinutes: { $avg: "$serviceMinutes" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },
      {
        $unwind: {
          path: "$staff",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { ticketsServed: -1 } },
      {
        $project: {
          _id: 0,
          staffId: "$_id",
          staffName: { $ifNull: ["$staff.name", "Unknown Staff"] },
          ticketsServed: 1,
          avgServiceMinutes: { $round: ["$avgServiceMinutes", 2] },
        },
      },
    ]);

    res.json({ data });
  } catch (err) {
    console.error("getStaffPerformance error:", err);
    res.status(500).json({ message: "Failed to load staff performance" });
  }
};

exports.getHourlyPeak = async (req, res) => {
  try {
    const aggregated = await Ticket.aggregate([
      {
        $group: {
          _id: { hour: { $hour: "$createdAt" } },
          totalTickets: { $sum: 1 },
        },
      },
      { $sort: { "_id.hour": 1 } },
      {
        $project: {
          _id: 0,
          hour: "$_id.hour",
          totalTickets: 1,
        },
      },
    ]);

    const map = new Map(aggregated.map((row) => [row.hour, row.totalTickets]));
    const data = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      totalTickets: map.get(hour) || 0,
      label: `${String(hour).padStart(2, "0")}:00`,
    }));

    res.json({ data });
  } catch (err) {
    console.error("getHourlyPeak error:", err);
    res.status(500).json({ message: "Failed to load hourly peak data" });
  }
};
