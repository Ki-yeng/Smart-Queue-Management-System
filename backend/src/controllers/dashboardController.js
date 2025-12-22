const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalTicketsToday = await Ticket.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    const waitingTickets = await Ticket.countDocuments({
      status: "waiting",
    });

    const ticketsPerService = await Ticket.aggregate([
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
    ]);

    const activeCounters = await Counter.countDocuments({
      isOpen: true,
    });

    res.json({
      totalTicketsToday,
      waitingTickets,
      avgWaitingTimeMinutes: 5,
      activeCounters,
      ticketsPerService,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
