const Ticket = require("../models/Ticket");
const { emitQueueUpdated, emitToUserOnly } = require("./socketEvents");

const NEAR_TURN_LIMIT = 3;
const NO_SHOW_TIMEOUT_MS = (parseInt(process.env.NO_SHOW_TIMEOUT_MINUTES || "5", 10) || 5) * 60 * 1000;

/**
 * Notify the first few waiting users in a service queue that their turn is near.
 * Also marks the first ticket as check-in required.
 */
async function notifyNearTurnForService(io, serviceType) {
  const queue = await Ticket.find({
    serviceType,
    status: "waiting",
  })
    .sort({ priorityScore: -1, createdAt: 1 })
    .limit(NEAR_TURN_LIMIT);

  for (let i = 0; i < queue.length; i += 1) {
    const ticket = queue[i];
    const isFirst = i === 0;

    const shouldUpdate =
      ticket.nearTurnNotifiedAt === null || Date.now() - new Date(ticket.nearTurnNotifiedAt).getTime() > 60 * 1000;

    if (shouldUpdate) {
      ticket.nearTurnNotifiedAt = new Date();
      if (isFirst) ticket.checkInRequired = true;
      await ticket.save();

      if (io && ticket.userId) {
        emitToUserOnly(io, ticket.userId, "nearTurnNotification", {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          serviceType: ticket.serviceType,
          position: i + 1,
          checkInRequired: isFirst,
          message: isFirst
            ? `Ticket #${ticket.ticketNumber}: please check in now, your turn is next`
            : `Ticket #${ticket.ticketNumber}: your turn is near (position ${i + 1})`,
        });
      }
    }
  }
}

/**
 * Mark waiting tickets as no-show if they were asked to check in but didn't.
 */
async function processNoShowTickets(io) {
  const cutoff = new Date(Date.now() - NO_SHOW_TIMEOUT_MS);
  const stale = await Ticket.find({
    status: "waiting",
    checkInRequired: true,
    checkedInAt: null,
    nearTurnNotifiedAt: { $ne: null, $lte: cutoff },
  });

  for (const ticket of stale) {
    ticket.status = "no_show";
    ticket.noShowAt = new Date();
    await ticket.save();

    if (io && ticket.userId) {
      emitToUserOnly(io, ticket.userId, "ticketNoShow", {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        serviceType: ticket.serviceType,
        message: `Ticket #${ticket.ticketNumber} marked as no-show due to missed check-in`,
      });
    }

    if (io) {
      emitQueueUpdated(io, ticket.serviceType);
    }
  }

  return stale.length;
}

function startNoShowMonitor(io, intervalMs = 60000) {
  const run = async () => {
    try {
      await processNoShowTickets(io);
    } catch (err) {
      console.error("No-show monitor failed:", err.message);
    }
  };
  run();
  return setInterval(run, intervalMs);
}

module.exports = {
  notifyNearTurnForService,
  processNoShowTickets,
  startNoShowMonitor,
};

