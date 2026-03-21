const Appointment = require("../models/Appointment");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { findBestCounterForTicket } = require("../utils/loadBalancer");
const { determinePriorityLevel, calculatePriorityScore } = require("../utils/priorityHelper");
const { emitTicketCreated, emitQueueUpdated } = require("../utils/socketEvents");
const { notifyNearTurnForService } = require("../utils/queueAutomation");

const resolveTargetUserId = (req) => {
  if (["admin", "staff"].includes(req.user?.role) && req.query?.userId) return String(req.query.userId);
  return String(req.user?._id || "");
};

exports.createAppointment = async (req, res) => {
  try {
    const userId = resolveTargetUserId(req);
    const { serviceType, appointmentTime, notes = "" } = req.body || {};
    if (!userId || !serviceType || !appointmentTime) {
      return res.status(400).json({ message: "serviceType and appointmentTime are required" });
    }

    const appointmentDate = new Date(appointmentTime);
    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: "Invalid appointmentTime" });
    }

    const appointment = await Appointment.create({
      userId,
      serviceType,
      appointmentTime: appointmentDate,
      notes,
    });

    return res.status(201).json({ message: "Appointment booked", appointment });
  } catch (err) {
    console.error("Create appointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const userId = resolveTargetUserId(req);
    if (!userId) return res.status(400).json({ message: "User not resolved" });

    const appointments = await Appointment.find({ userId })
      .sort({ appointmentTime: 1 })
      .limit(50)
      .lean();
    return res.json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = resolveTargetUserId(req);
    const query = { _id: id };
    if (!["admin", "staff"].includes(req.user?.role)) query.userId = userId;

    const appointment = await Appointment.findOne(query);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (appointment.status !== "booked") {
      return res.status(400).json({ message: `Cannot cancel appointment with status ${appointment.status}` });
    }

    appointment.status = "cancelled";
    await appointment.save();
    return res.json({ message: "Appointment cancelled", appointment });
  } catch (err) {
    console.error("Cancel appointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.joinQueueFromAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = resolveTargetUserId(req);
    const query = { _id: id };
    if (!["admin", "staff"].includes(req.user?.role)) query.userId = userId;

    const appointment = await Appointment.findOne(query);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (appointment.status !== "booked") {
      return res.status(400).json({ message: `Cannot join queue from status ${appointment.status}` });
    }

    const activeTicket = await Ticket.findOne({
      userId: appointment.userId,
      status: { $in: ["waiting", "serving"] },
    });
    if (activeTicket) {
      return res.status(400).json({
        message: `User already has an active ticket (#${activeTicket.ticketNumber}) for ${activeTicket.serviceType}.`,
      });
    }

    const user = await User.findById(appointment.userId);
    if (!user) return res.status(404).json({ message: "Target user not found" });

    const lastTicket = await Ticket.findOne({ serviceType: appointment.serviceType }).sort({ ticketNumber: -1 });
    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;
    const priority = determinePriorityLevel(user);

    const ticket = await Ticket.create({
      ticketNumber: nextTicketNumber,
      serviceType: appointment.serviceType,
      status: "waiting",
      studentName: user.name,
      email: user.email,
      userId: user._id,
      priority,
      priorityScore: calculatePriorityScore({ createdAt: new Date(), priority }, user),
    });

    const bestCounter = await findBestCounterForTicket(appointment.serviceType, priority);
    if (bestCounter?.counterId) {
      ticket.counterId = bestCounter.counterId;
      await ticket.save();
    }

    appointment.status = "joined_queue";
    appointment.linkedTicketId = ticket._id;
    await appointment.save();

    const io = req.app?.get("io");
    if (io) {
      emitTicketCreated(io, ticket);
      emitQueueUpdated(io, ticket.serviceType);
      await notifyNearTurnForService(io, ticket.serviceType);
    }

    return res.json({ message: "Joined queue from appointment", appointment, ticket });
  } catch (err) {
    console.error("Join queue from appointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

