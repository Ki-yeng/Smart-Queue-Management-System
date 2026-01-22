const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * Health Check Routes
 * All routes for system health monitoring
 */

// Simple health check (no auth required for basic endpoint)
router.get('/', healthController.simpleHealthCheck);

// Comprehensive health status (all systems)
router.get('/status', healthController.getSystemHealth);

// Database health details
router.get('/database', healthController.getDatabaseHealth);

// Service availability
router.get('/services', healthController.getServiceHealth);

// Performance metrics
router.get('/metrics', healthController.getMetrics);

// Queue metrics
router.get('/queue', healthController.getQueueHealth);

// Server uptime
router.get('/uptime', healthController.getUptime);

module.exports = router;
