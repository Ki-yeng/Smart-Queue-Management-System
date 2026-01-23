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

  // Emit to ALL connected clients (broadcast to everyone)
  io.emit(event, eventData);

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
    to: ["ALL CLIENTS", `service-${ticket.serviceType}`, "dashboard"],
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
const emitQueueUpdated = (io, serviceType, tickets = []) => {
  if (!io) return;

  const eventData = {
    serviceType,
    totalWaiting: tickets.length || 0,
    tickets: (tickets || []).map((t) => ({
      ticketNumber: t.ticketNumber,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
    })),
    timestamp: new Date(),
  };

  // Emit to ALL connected clients
  io.emit("queueUpdated", eventData);

  // Emit to specific service queue room
  io.to(`service-${serviceType}`).emit("queueUpdated", eventData);

  // Emit to dashboard
  io.to("dashboard").emit("queueUpdated", eventData);

  console.log(`📡 Queue updated (ALL CLIENTS) for ${serviceType}:`, tickets.length);
};

/**
 * Emit counter status update
 * Broadcasts to all connected clients + specific rooms
 */
const emitCounterStatusUpdated = (io, counter) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    status: counter.status,
    currentTicket: counter.currentTicket,
    staffAssigned: counter.staffAssigned,
    serviceTypes: counter.serviceTypes,
    totalServed: counter.totalServed,
    averageServiceTime: counter.averageServiceTime,
    timestamp: new Date(),
  };

  // Emit to ALL connected clients
  io.emit("counterStatusUpdated", eventData);

  // Emit to dashboard
  io.to("dashboard").emit("counterStatusUpdated", eventData);

  // Emit to specific counter room
  io.to(`counter-${counter._id}`).emit("counterStatusUpdated", eventData);

  console.log(`📡 Counter status updated (ALL CLIENTS): ${counter.counterName} - ${counter.status}`);
};

/**
 * Emit when a counter becomes busy/open/closed
 */
const emitCounterStatusChanged = (io, counter, oldStatus, reason = "") => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    oldStatus,
    newStatus: counter.status,
    reason,
    currentTicket: counter.currentTicket,
    staffAssigned: counter.staffAssigned,
    timestamp: new Date(),
    message: `Counter ${counter.counterName} is now ${counter.status}${reason ? ` (${reason})` : ""}`,
  };

  // Emit to ALL connected clients
  io.emit("counterStatusChanged", eventData);

  // Emit to dashboard
  io.to("dashboard").emit("counterStatusChanged", eventData);

  // Emit to counter room
  io.to(`counter-${counter._id}`).emit("counterStatusChanged", eventData);

  console.log(`📡 Counter status changed (ALL CLIENTS): ${counter.counterName} ${oldStatus} → ${counter.status}`);
};

/**
 * Emit when staff is assigned to a counter
 */
const emitCounterStaffAssigned = (io, counter, staffMember) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    staffId: staffMember._id,
    staffName: staffMember.name,
    staffEmail: staffMember.email,
    timestamp: new Date(),
    message: `Staff ${staffMember.name} assigned to counter ${counter.counterName}`,
  };

  // Emit to ALL connected clients
  io.emit("counterStaffAssigned", eventData);

  // Emit to dashboard
  io.to("dashboard").emit("counterStaffAssigned", eventData);

  // Emit to counter room
  io.to(`counter-${counter._id}`).emit("counterStaffAssigned", eventData);

  console.log(`📡 Counter staff assigned (ALL CLIENTS): ${staffMember.name} → ${counter.counterName}`);
};

/**
 * Emit counter metrics update
 */
const emitCounterMetricsUpdated = (io, counter) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    totalServed: counter.totalServed,
    averageServiceTime: counter.averageServiceTime,
    currentQueue: counter.queueCount || 0,
    peakHourServed: counter.peakHourServed,
    status: counter.status,
    timestamp: new Date(),
  };

  // Emit to ALL connected clients
  io.emit("counterMetricsUpdated", eventData);

  // Emit to dashboard
  io.to("dashboard").emit("counterMetricsUpdated", eventData);

  console.log(`📡 Counter metrics updated (ALL CLIENTS): ${counter.counterName}`);
};

/**
 * Room-Based Counter Updates
 * Staff only sees their assigned counter updates
 */

/**
 * Emit counter update to staff room only (staff at this counter only)
 */
const emitCounterUpdateToStaff = (io, counter, event, details = {}) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    status: counter.status,
    currentTicket: counter.currentTicket,
    staffAssigned: counter.staffAssigned,
    serviceTypes: counter.serviceTypes,
    totalServed: counter.totalServed,
    averageServiceTime: counter.averageServiceTime,
    timestamp: new Date(),
    ...details,
  };

  // Emit ONLY to staff at this counter (counter room)
  io.to(`counter-${counter._id}`).emit(event, eventData);

  console.log(`📡 Counter update (STAFF ONLY): ${event} → ${counter.counterName}`);
};

/**
 * Emit ticket to counter staff (staff sees their assigned tickets)
 */
const emitTicketToCounterStaff = (io, ticket, counterId, event, details = {}) => {
  if (!io) return;

  const eventData = {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    serviceType: ticket.serviceType,
    status: ticket.status,
    priority: ticket.priority,
    studentName: ticket.studentName,
    email: ticket.email,
    userId: ticket.userId,
    timestamp: new Date(),
    ...details,
  };

  // Emit ONLY to counter staff room
  io.to(`counter-${counterId}`).emit(event, eventData);

  console.log(`📡 Ticket update (COUNTER STAFF): ${event} → Counter ${counterId}`);
};

/**
 * Emit update to service-specific staff only (not all clients)
 */
const emitToServiceStaffOnly = (io, serviceType, event, data = {}) => {
  if (!io) return;

  const eventData = {
    serviceType,
    timestamp: new Date(),
    ...data,
  };

  // Emit ONLY to service queue room
  io.to(`service-${serviceType}`).emit(event, eventData);

  console.log(`📡 Service update (SERVICE STAFF ONLY): ${event} → ${serviceType}`);
};

/**
 * Emit personal notification to specific user only
 */
const emitToUserOnly = (io, userId, event, data = {}) => {
  if (!io) return;

  const eventData = {
    userId,
    timestamp: new Date(),
    ...data,
  };

  // Emit ONLY to this user's personal room
  io.to(`user-${userId}`).emit(event, eventData);

  console.log(`📡 Personal update (USER ONLY): ${event} → User ${userId}`);
};

/**
 * Emit to dashboard only (not to all clients)
 */
const emitToDashboardOnly = (io, event, data = {}) => {
  if (!io) return;

  const eventData = {
    timestamp: new Date(),
    ...data,
  };

  // Emit ONLY to dashboard room
  io.to("dashboard").emit(event, eventData);

  console.log(`📡 Dashboard update (DASHBOARD ONLY): ${event}`);
};

/**
 * Emit counter update to staff + dashboard (not all clients)
 */
const emitCounterUpdateToStaffAndDashboard = (io, counter, event, details = {}) => {
  if (!io) return;

  const eventData = {
    counterId: counter._id,
    counterName: counter.counterName,
    status: counter.status,
    currentTicket: counter.currentTicket,
    staffAssigned: counter.staffAssigned,
    timestamp: new Date(),
    ...details,
  };

  // Emit to counter staff room
  io.to(`counter-${counter._id}`).emit(event, eventData);

  // Emit to dashboard
  io.to("dashboard").emit(event, eventData);

  console.log(`📡 Counter update (STAFF + DASHBOARD): ${event} → ${counter.counterName}`);
};

/**
 * Emit ticket update to service staff + dashboard (not all clients)
 */
const emitTicketToServiceAndDashboard = (io, ticket, event, details = {}) => {
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

  // Emit to service queue room
  io.to(`service-${ticket.serviceType}`).emit(event, eventData);

  // Emit to dashboard
  io.to("dashboard").emit(event, eventData);

  // Emit to user if exists
  if (ticket.userId) {
    io.to(`user-${ticket.userId}`).emit(event, eventData);
  }

  console.log(`📡 Ticket update (SERVICE + DASHBOARD): ${event} → ${ticket.serviceType}`);
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

/**
 * Emit load balancing metrics update
 * Called by the load balancing monitor to broadcast real-time metrics
 */
const emitLoadMetricsUpdated = (io, metricsData) => {
  if (!io) return;

  io.emit("loadMetricsUpdated", {
    ...metricsData,
    timestamp: new Date(),
  });

  console.log(`📊 Load metrics broadcast - System Load: ${metricsData.summary?.systemLoad}`);
};

module.exports = {
  // Broadcast to all clients
  emitTicketStatusUpdate,
  emitTicketCreated,
  emitTicketServing,
  emitTicketCompleted,
  emitTicketCancelled,
  emitTicketTransferred,
  emitTicketPriorityUpdated,
  emitQueueUpdated,
  emitCounterStatusUpdated,
  emitCounterStatusChanged,
  emitCounterStaffAssigned,
  emitCounterMetricsUpdated,
  
  // Room-based updates (staff sees their counter updates only)
  emitCounterUpdateToStaff,
  emitTicketToCounterStaff,
  emitToServiceStaffOnly,
  emitToUserOnly,
  emitToDashboardOnly,
  emitCounterUpdateToStaffAndDashboard,
  emitTicketToServiceAndDashboard,
  
  // Dashboard
  emitDashboardStats,
  emitLoadMetricsUpdated,
};
