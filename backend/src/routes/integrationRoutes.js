const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

/**
 * Integration Status Routes
 * Routes for monitoring external system integrations:
 * - Finance System
 * - Academics System
 * - Exams System
 */

// Get all integration statuses
router.get('/status', integrationController.getAllIntegrationStatus);

// Get integration summary
router.get('/summary', integrationController.getIntegrationSummary);

// Get integration statistics
router.get('/statistics', integrationController.getIntegrationStatistics);

// Finance System routes
router.get('/finance/status', integrationController.getFinanceStatus);
router.get('/finance/health', integrationController.getSystemHealth);
router.get('/finance/metrics', integrationController.getIntegrationMetrics);
router.get('/finance/diagnostics', integrationController.getIntegrationDiagnostics);
router.post('/finance/verify', integrationController.verifyIntegration);
router.post('/finance/test-sync', integrationController.testDataSync);

// Academics System routes
router.get('/academics/status', integrationController.getAcademicsStatus);
router.get('/academics/health', integrationController.getSystemHealth);
router.get('/academics/metrics', integrationController.getIntegrationMetrics);
router.get('/academics/diagnostics', integrationController.getIntegrationDiagnostics);
router.post('/academics/verify', integrationController.verifyIntegration);
router.post('/academics/test-sync', integrationController.testDataSync);

// Exams System routes
router.get('/exams/status', integrationController.getExamsStatus);
router.get('/exams/health', integrationController.getSystemHealth);
router.get('/exams/metrics', integrationController.getIntegrationMetrics);
router.get('/exams/diagnostics', integrationController.getIntegrationDiagnostics);
router.post('/exams/verify', integrationController.verifyIntegration);
router.post('/exams/test-sync', integrationController.testDataSync);

// Generic system endpoint
router.get('/:system/status', integrationController.getSystemHealth);
router.get('/:system/metrics', integrationController.getIntegrationMetrics);
router.get('/:system/diagnostics', integrationController.getIntegrationDiagnostics);
router.post('/:system/verify', integrationController.verifyIntegration);
router.post('/:system/test-sync', integrationController.testDataSync);

module.exports = router;
