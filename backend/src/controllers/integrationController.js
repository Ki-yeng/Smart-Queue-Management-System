const integrationChecker = require('../utils/integrationChecker');

/**
 * Integration Controller
 * Handles all integration status endpoints
 */

/**
 * Get all integration statuses
 * GET /api/integrations/status
 */
exports.getAllIntegrationStatus = async (req, res) => {
  try {
    const status = await integrationChecker.checkAllIntegrations();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking all integrations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check integration status',
      error: error.message,
    });
  }
};

/**
 * Get Finance System integration status
 * GET /api/integrations/finance/status
 */
exports.getFinanceStatus = async (req, res) => {
  try {
    const status = await integrationChecker.checkFinanceIntegration();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking finance integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check finance integration',
      error: error.message,
    });
  }
};

/**
 * Get Academics System integration status
 * GET /api/integrations/academics/status
 */
exports.getAcademicsStatus = async (req, res) => {
  try {
    const status = await integrationChecker.checkAcademicsIntegration();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking academics integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check academics integration',
      error: error.message,
    });
  }
};

/**
 * Get Exams System integration status
 * GET /api/integrations/exams/status
 */
exports.getExamsStatus = async (req, res) => {
  try {
    const status = await integrationChecker.checkExamsIntegration();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking exams integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check exams integration',
      error: error.message,
    });
  }
};

/**
 * Get integration metrics
 * GET /api/integrations/:system/metrics
 */
exports.getIntegrationMetrics = async (req, res) => {
  try {
    const { system } = req.params;

    if (!['finance', 'academics', 'exams'].includes(system)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid system. Must be one of: finance, academics, exams',
      });
    }

    const metrics = await integrationChecker.getIntegrationMetrics(system);
    res.status(200).json(metrics);
  } catch (error) {
    console.error(`Error getting ${req.params.system} metrics:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve metrics',
      error: error.message,
    });
  }
};

/**
 * Get integration statistics for all systems
 * GET /api/integrations/statistics
 */
exports.getIntegrationStatistics = async (req, res) => {
  try {
    const stats = await integrationChecker.getIntegrationStatistics();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting integration statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve statistics',
      error: error.message,
    });
  }
};

/**
 * Get detailed diagnostics for a system
 * GET /api/integrations/:system/diagnostics
 */
exports.getIntegrationDiagnostics = async (req, res) => {
  try {
    const { system } = req.params;

    if (!['finance', 'academics', 'exams'].includes(system)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid system. Must be one of: finance, academics, exams',
      });
    }

    const diagnostics = await integrationChecker.getDiagnostics(system);
    res.status(200).json(diagnostics);
  } catch (error) {
    console.error(`Error getting ${req.params.system} diagnostics:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve diagnostics',
      error: error.message,
    });
  }
};

/**
 * Test data synchronization
 * POST /api/integrations/:system/test-sync
 */
exports.testDataSync = async (req, res) => {
  try {
    const { system } = req.params;
    const testData = req.body;

    if (!['finance', 'academics', 'exams'].includes(system)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid system. Must be one of: finance, academics, exams',
      });
    }

    const result = await integrationChecker.testDataSync(system, testData);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error testing data sync for ${req.params.system}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test data synchronization',
      error: error.message,
    });
  }
};

/**
 * Health check for specific integration
 * GET /api/integrations/:system/health
 */
exports.getSystemHealth = async (req, res) => {
  try {
    const { system } = req.params;

    if (!['finance', 'academics', 'exams'].includes(system)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid system. Must be one of: finance, academics, exams',
      });
    }

    let status;
    if (system === 'finance') {
      status = await integrationChecker.checkFinanceIntegration();
    } else if (system === 'academics') {
      status = await integrationChecker.checkAcademicsIntegration();
    } else if (system === 'exams') {
      status = await integrationChecker.checkExamsIntegration();
    }

    const httpStatus = status.connected ? 200 : 503;
    res.status(httpStatus).json(status);
  } catch (error) {
    console.error(`Error checking ${req.params.system} health:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check system health',
      error: error.message,
    });
  }
};

/**
 * Verify integration with payload
 * POST /api/integrations/:system/verify
 */
exports.verifyIntegration = async (req, res) => {
  try {
    const { system } = req.params;
    const payload = req.body;

    if (!['finance', 'academics', 'exams'].includes(system)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid system. Must be one of: finance, academics, exams',
      });
    }

    const result = await integrationChecker.checkIntegrationWithPayload(system, payload);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error verifying ${req.params.system}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify integration',
      error: error.message,
    });
  }
};

/**
 * Get integration summary
 * GET /api/integrations/summary
 */
exports.getIntegrationSummary = async (req, res) => {
  try {
    const status = await integrationChecker.checkAllIntegrations();
    
    const summary = {
      timestamp: status.timestamp,
      overallStatus: status.status,
      summary: status.summary,
      systems: {
        finance: {
          status: status.integrations.finance.status,
          connected: status.integrations.finance.connected,
          responseTime: status.integrations.finance.responseTime,
        },
        academics: {
          status: status.integrations.academics.status,
          connected: status.integrations.academics.connected,
          responseTime: status.integrations.academics.responseTime,
        },
        exams: {
          status: status.integrations.exams.status,
          connected: status.integrations.exams.connected,
          responseTime: status.integrations.exams.responseTime,
        },
      },
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting integration summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get integration summary',
      error: error.message,
    });
  }
};
