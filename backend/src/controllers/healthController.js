const healthChecker = require('../utils/healthChecker');
const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');
const User = require('../models/User');

/**
 * Health Controller
 * Handles all health status endpoints
 */

/**
 * Get comprehensive system health status
 * GET /api/health/status
 */
exports.getSystemHealth = async (req, res) => {
  try {
    const health = await healthChecker.getSystemHealth();
    res.status(200).json(health);
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system health',
      error: error.message,
    });
  }
};

/**
 * Get database health details
 * GET /api/health/database
 */
exports.getDatabaseHealth = async (req, res) => {
  try {
    const dbHealth = await healthChecker.checkDatabaseConnection();

    // Get database statistics
    let dbStats = {};
    try {
      const collections = await Promise.all([
        Ticket.countDocuments(),
        Counter.countDocuments(),
        User.countDocuments(),
      ]);

      dbStats = {
        tickets: collections[0],
        counters: collections[1],
        users: collections[2],
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
    }

    res.status(200).json({
      status: dbHealth.status,
      connection: dbHealth,
      collections: dbStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting database health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve database health',
      error: error.message,
    });
  }
};

/**
 * Get service availability status
 * GET /api/health/services
 */
exports.getServiceHealth = async (req, res) => {
  try {
    const serviceHealth = await healthChecker.checkServiceAvailability();

    res.status(200).json({
      status: serviceHealth.status,
      services: serviceHealth.services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting service health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve service health',
      error: error.message,
    });
  }
};

/**
 * Get system performance metrics
 * GET /api/health/metrics
 */
exports.getMetrics = async (req, res) => {
  try {
    const memory = healthChecker.checkMemoryUsage();
    const cpu = healthChecker.checkCPUUsage();
    const metrics = healthChecker.getMetrics();

    res.status(200).json({
      memory,
      cpu,
      application: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve metrics',
      error: error.message,
    });
  }
};

/**
 * Get queue health metrics
 * GET /api/health/queue
 */
exports.getQueueHealth = async (req, res) => {
  try {
    const ticketStats = await Ticket.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          served: [{ $match: { status: 'served' } }, { $count: 'count' }],
          waiting: [{ $match: { status: 'waiting' } }, { $count: 'count' }],
          processing: [{ $match: { status: 'processing' } }, { $count: 'count' }],
          avgWaitTime: [
            {
              $group: {
                _id: null,
                avgWait: {
                  $avg: { $subtract: ['$servedAt', '$createdAt'] },
                },
              },
            },
          ],
        },
      },
    ]);

    const counterStats = await Counter.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: 'available' } }, { $count: 'count' }],
          inactive: [{ $match: { status: 'inactive' } }, { $count: 'count' }],
          occupancy: [
            {
              $group: {
                _id: null,
                avgLoad: { $avg: { $toInt: '$currentLoad' } },
              },
            },
          ],
        },
      },
    ]);

    const queueHealth = {
      tickets: {
        total: ticketStats[0].total[0]?.count || 0,
        served: ticketStats[0].served[0]?.count || 0,
        waiting: ticketStats[0].waiting[0]?.count || 0,
        processing: ticketStats[0].processing[0]?.count || 0,
        avgWaitTimeMs: ticketStats[0].avgWaitTime[0]?.avgWait || 0,
      },
      counters: {
        total: counterStats[0].total[0]?.count || 0,
        active: counterStats[0].active[0]?.count || 0,
        inactive: counterStats[0].inactive[0]?.count || 0,
        avgOccupancy: counterStats[0].occupancy[0]?.avgLoad || 0,
      },
      health: {
        queueStatus: ticketStats[0].waiting[0]?.count > 20 ? 'busy' : 'normal',
        allCountersActive: counterStats[0].active[0]?.count === counterStats[0].total[0]?.count,
      },
    };

    res.status(200).json({
      ...queueHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting queue health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve queue health',
      error: error.message,
    });
  }
};

/**
 * Get server uptime
 * GET /api/health/uptime
 */
exports.getUptime = (req, res) => {
  try {
    const uptime = healthChecker.getUptime();

    res.status(200).json({
      uptime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting uptime:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve uptime',
      error: error.message,
    });
  }
};

/**
 * Simple health check (for quick pings)
 * GET /api/health
 */
exports.simpleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
