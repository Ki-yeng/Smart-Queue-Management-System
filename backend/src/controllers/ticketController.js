// backend/src/controllers/ticketController.js
const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

/**
 * Create a new ticket (student)
 */
exports.createTicket = async (req, res) => {
  try {
    const { serviceType, studentName, email } = req.body;
    if (!serviceType || !studentName || !email) {
      return res.status(400).json({ message: "serviceType, studentName and email are required" });
    }

    const lastTicket = await Ticket.findOne({ serviceType }).sort({ ticketNumber: -1 });
    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    const ticket = await Ticket.create({
      ticketNumber: nextTicketNumber,
      serviceType,
      status: "waiting",
      studentName,
      email,
    });

    res.status(201).json({ message: "Ticket created", ticket });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get next ticket for a service type
 */
exports.getNextTicket = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const ticket = await Ticket.findOne({ serviceType, status: "waiting" }).sort({ createdAt: 1 });

    if (!ticket) return res.status(404).json({ message: "No waiting tickets" });

    res.json(ticket);
  } catch (err) {
    console.error("Get next ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all tickets (for staff dashboard)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ status: "waiting" }).sort({ createdAt: 1 });
    res.json(tickets);
  } catch (err) {
    console.error("Get all tickets error:", err);
    res.status(500).json({ message: "Failed to load tickets" });
  }
};

/**
 * Serve ticket
 */
exports.serveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { counterId } = req.body;
    if (!counterId) return res.status(400).json({ message: "counterId required" });

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.status !== "waiting") return res.status(400).json({ message: "Invalid ticket" });

    const counter = await Counter.findById(counterId);
    if (!counter) return res.status(404).json({ message: "Counter not found" });

    ticket.status = "serving";
    ticket.servedAt = new Date();
    ticket.counterId = counter._id;
    counter.status = "busy";
    counter.currentTicket = ticket._id;

    await ticket.save();
    await counter.save();

    res.json({ message: "Ticket is now being served", ticket });
  } catch (err) {
    console.error("Serve ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Complete ticket
 */
exports.completeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "completed";
    await ticket.save();

    if (ticket.counterId) {
      await Counter.findByIdAndUpdate(ticket.counterId, { status: "open", currentTicket: null });
    }

    res.json({ message: "Ticket completed", ticket });
  } catch (err) {
    console.error("Complete ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel ticket
 */
exports.cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "cancelled";
    await ticket.save();

    if (ticket.counterId) {
      await Counter.findByIdAndUpdate(ticket.counterId, { status: "open", currentTicket: null });
    }

    res.json({ message: "Ticket cancelled", ticket });
  } catch (err) {
    console.error("Cancel ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
