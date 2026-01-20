const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

exports.getDashboardStats = async (req, res) => {
  try {
    // Get tickets from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTicketsToday = await Ticket.countDocuments({
      createdAt: {
        $gte: today,
      },
    });

    const waitingTickets = await Ticket.countDocuments({
      status: "waiting",
    });

    const servingTickets = await Ticket.countDocuments({
      status: "serving",
    });

    const completedTickets = await Ticket.countDocuments({
      status: "completed",
      completedAt: {
        $gte: today,
      },
    });

    // Calculate average waiting time from completed tickets today
    const completedTicketsData = await Ticket.find({
      status: "completed",
      completedAt: {
        $gte: today,
      },
    });

    let avgWaitingTimeMinutes = 0;
    if (completedTicketsData.length > 0) {
      const totalWaitTime = completedTicketsData.reduce((acc, ticket) => {
        const waitTime = (new Date(ticket.completedAt) - new Date(ticket.createdAt)) / (1000 * 60);
        return acc + waitTime;
      }, 0);
      avgWaitingTimeMinutes = Math.round(totalWaitTime / completedTicketsData.length);
    }

    const ticketsPerService = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
    ]);

    const activeCounters = await Counter.countDocuments({
      status: { $ne: "closed" },
    });

    res.json({
      totalTicketsToday,
      waitingTickets,
      servingTickets,
      completedTickets,
      avgWaitingTimeMinutes,
      activeCounters,
      ticketsPerService,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
