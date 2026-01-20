/**
 * Priority calculation helper functions for ticket queue system
 */

/**
 * Calculate priority score based on ticket attributes
 * Higher score = higher priority
 * 
 * Priority tiers:
 * - Normal: 0-99
 * - High (Final Year + Accessibility): 100-199
 * - Urgent (VIP): 200-299
 */
const calculatePriorityScore = (ticket, user = null) => {
  let score = 0;

  // Base score by priority level
  const priorityLevels = {
    normal: 0,
    high: 100,
    urgent: 150,
    vip: 200,
  };

  score += priorityLevels[ticket.priority] || 0;

  // Additional scoring based on user attributes
  if (user) {
    // Final year students get priority boost
    if (user.studentYear === "Final Year") {
      score += 50;
    }

    // Postgraduate students get slight priority boost
    if (user.studentYear === "Postgraduate") {
      score += 25;
    }

    // Accessibility needs get significant boost
    if (user.hasAccessibilityNeeds) {
      score += 75;
    }

    // VIP status gets highest boost
    if (user.isVIP) {
      score += 100;
    }
  }

  // Time-based boost: older tickets get slight priority increase
  // Add 1 point for every 5 minutes waiting (max 50 points)
  if (ticket.createdAt) {
    const waitTimeMinutes = Math.floor(
      (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60)
    );
    const timeBoost = Math.min(Math.floor(waitTimeMinutes / 5), 50);
    score += timeBoost;
  }

  return score;
};

/**
 * Determine priority level based on user attributes
 */
const determinePriorityLevel = (user = null) => {
  if (!user) return "normal";

  if (user.isVIP) return "vip";
  if (user.hasAccessibilityNeeds || user.studentYear === "Final Year") return "high";

  return "normal";
};

/**
 * Get human readable priority label
 */
const getPriorityLabel = (priority) => {
  const labels = {
    normal: "Normal",
    high: "High Priority",
    urgent: "Urgent",
    vip: "VIP",
  };
  return labels[priority] || "Unknown";
};

/**
 * Sort tickets by priority score and creation time
 */
const sortByPriority = (tickets) => {
  return tickets.sort((a, b) => {
    // First sort by priority score (descending)
    if (a.priorityScore !== b.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // Then by creation time (ascending - first come, first served within same priority)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
};

module.exports = {
  calculatePriorityScore,
  determinePriorityLevel,
  getPriorityLabel,
  sortByPriority,
};
