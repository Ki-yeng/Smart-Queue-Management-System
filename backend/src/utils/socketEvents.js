/**
 * Socket.IO event emitter for ticket updates
 * Handles real-time broadcasting of ticket status changes
 */

const emitTicketStatusUpdate = (io, ticket, event, details = {}) => {
  if (!io) return;

  const eventData = {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    serviceType: ticket.serviceType,
    status: ticket.status,
    priority: ticket.priority,
    timestamp: new Date(),
    ...details,
  };

  // Emit to specific service type room (all staff monitoring this service)
  io.to(`service-${ticket.serviceType}`).emit(event, eventData);

  // Emit to dashboard room (all staff dashboards)
  io.to("dashboard").emit(event, eventData);

  // If ticket has a user, notify that specific user
  if (ticket.userId) {
    io.to(`user-${ticket.userId}`).emit(event, eventData);
  }

  console.log(`📡 Socket event emitted: ${event}`, {
    ticketNumber: ticket.ticketNumber,
    to: [`service-${ticket.serviceType}`, "dashboard"],
  });
};

/**
 * Emit when a new ticket is created
 */
const emitTicketCreated = (io, ticket) => {
  emitTicketStatusUpdate(io, ticket, "ticketCreated", {
    message: `New ticket #${ticket.ticketNumber} created`,
  });
};

/**
 * Emit when ticket starts being served
 */
const emitTicketServing = (io, ticket, counterName) => {
  emitTicketStatusUpdate(io, ticket, "ticketServing", {
    message: `Ticket #${ticket.ticketNumber} is now being served at ${counterName}`,
    counterId: ticket.counterId,
    counterName,
  });
};

/**
 * Emit when ticket is completed
 */
const emitTicketCompleted = (io, ticket, counterName) => {
  emitTicketStatusUpdate(io, ticket, "ticketCompleted", {
    message: `Ticket #${ticket.ticketNumber} has been completed`,
    completedAt: ticket.completedAt,
    counterName,
  });
};

/**
 * Emit when ticket is cancelled
 */
const emitTicketCancelled = (io, ticket) => {
  emitTicketStatusUpdate(io, ticket, "ticketCancelled", {
    message: `Ticket #${ticket.ticketNumber} has been cancelled`,
    cancelledAt: ticket.cancelledAt,
  });
};

/**
 * Emit when ticket is transferred to another counter
 */
const emitTicketTransferred = (io, ticket, fromCounter, toCounter) => {
  emitTicketStatusUpdate(io, ticket, "ticketTransferred", {
    message: `Ticket #${ticket.ticketNumber} transferred from ${fromCounter?.counterName} to ${toCounter?.counterName}`,
    fromCounterId: fromCounter?._id,
    fromCounterName: fromCounter?.counterName,
    toCounterId: toCounter?._id,
    toCounterName: toCounter?.counterName,
    transferHistory: ticket.transferHistory,
  });
};

/**
 * Emit when ticket priority is updated
 */
const emitTicketPriorityUpdated = (io, ticket, oldPriority) => {
  emitTicketStatusUpdate(io, ticket, "ticketPriorityUpdated", {
    message: `Ticket #${ticket.ticketNumber} priority changed from ${oldPriority} to ${ticket.priority}`,
    oldPriority,
    newPriority: ticket.priority,
    priorityScore: ticket.priorityScore,
  });
};

/**
 * Emit queue update (used for real-time queue updates)
 */
const emitQueueUpdated = (io, serviceType, tickets) => {
  if (!io) return;

  io.to(`service-${serviceType}`).emit("queueUpdated", {
    serviceType,
    totalWaiting: tickets.length,
    tickets: tickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
    })),
    timestamp: new Date(),
  });

  console.log(`📡 Queue updated for ${serviceType}:`, tickets.length);
};

/**
 * Emit counter status update
 */
const emitCounterStatusUpdated = (io, counter) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    status: counter.status,
    currentTicket: counter.currentTicket,
    timestamp: new Date(),
  };

  io.to("dashboard").emit("counterStatusUpdated", eventData);
  io.to(`counter-${counter._id}`).emit("counterStatusUpdated", eventData);

  console.log(`📡 Counter status updated: ${counter.counterName} - ${counter.status}`);
};

/**
 * Broadcast dashboard statistics update
 */
const emitDashboardStats = (io, stats) => {
  if (!io) return;

  io.to("dashboard").emit("dashboardStatsUpdated", {
    ...stats,
    timestamp: new Date(),
  });
};

module.exports = {
  emitTicketStatusUpdate,
  emitTicketCreated,
  emitTicketServing,
  emitTicketCompleted,
  emitTicketCancelled,
  emitTicketTransferred,
  emitTicketPriorityUpdated,
  emitQueueUpdated,
  emitCounterStatusUpdated,
  emitDashboardStats,
};
