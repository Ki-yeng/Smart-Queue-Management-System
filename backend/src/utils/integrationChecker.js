const axios = require('axios');
const mongoose = require('mongoose');

/**
 * Integration Status Checker
 * Monitors connectivity and status of external systems:
 * - Finance System
 * - Academics System
 * - Exams System
 */
class IntegrationChecker {
  constructor() {
    this.integrations = {
      finance: {
        name: 'Finance System',
        endpoint: process.env.FINANCE_API_URL || 'http://localhost:3001',
        healthCheck: '/api/health',
        timeout: 5000,
        retries: 2,
      },
      academics: {
        name: 'Academics System',
        endpoint: process.env.ACADEMICS_API_URL || 'http://localhost:3002',
        healthCheck: '/api/health',
        timeout: 5000,
        retries: 2,
      },
      exams: {
        name: 'Exams System',
        endpoint: process.env.EXAMS_API_URL || 'http://localhost:3003',
        healthCheck: '/api/health',
        timeout: 5000,
        retries: 2,
      },
    };

    this.integrationMetrics = {
      finance: { lastCheck: null, uptime: 0, failureCount: 0, averageResponseTime: 0 },
      academics: { lastCheck: null, uptime: 0, failureCount: 0, averageResponseTime: 0 },
      exams: { lastCheck: null, uptime: 0, failureCount: 0, averageResponseTime: 0 },
    };

    this.startTime = Date.now();
  }

  /**
   * Check all integration statuses
   */
  async checkAllIntegrations() {
    const checks = await Promise.all([
      this.checkFinanceIntegration(),
      this.checkAcademicsIntegration(),
      this.checkExamsIntegration(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: this.aggregateStatus(checks),
      integrations: {
        finance: checks[0],
        academics: checks[1],
        exams: checks[2],
      },
      summary: this.generateSummary(checks),
    };
  }

  /**
   * Check Finance System Integration
   */
  async checkFinanceIntegration() {
    return this.checkIntegrationHealth('finance');
  }

  /**
   * Check Academics System Integration
   */
  async checkAcademicsIntegration() {
    return this.checkIntegrationHealth('academics');
  }

  /**
   * Check Exams System Integration
   */
  async checkExamsIntegration() {
    return this.checkIntegrationHealth('exams');
  }

  /**
   * Generic integration health check with retry logic
   */
  async checkIntegrationHealth(systemKey) {
    const system = this.integrations[systemKey];
    const metrics = this.integrationMetrics[systemKey];
    const startTime = Date.now();

    try {
      const result = await this.performHealthCheck(system);
      const responseTime = Date.now() - startTime;

      // Update metrics
      metrics.lastCheck = new Date().toISOString();
      metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;

      return {
        system: systemKey,
        name: system.name,
        status: 'healthy',
        connected: true,
        endpoint: system.endpoint,
        responseTime,
        timestamp: new Date().toISOString(),
        lastCheck: metrics.lastCheck,
        failureCount: metrics.failureCount,
        uptime: this.calculateUptime(metrics),
        details: {
          remoteStatus: result.status || 'operational',
          version: result.version || 'unknown',
          timestamp: result.timestamp || new Date().toISOString(),
        },
      };
    } catch (error) {
      metrics.lastCheck = new Date().toISOString();
      metrics.failureCount++;

      return {
        system: systemKey,
        name: system.name,
        status: 'unhealthy',
        connected: false,
        endpoint: system.endpoint,
        error: error.message,
        timestamp: new Date().toISOString(),
        lastCheck: metrics.lastCheck,
        failureCount: metrics.failureCount,
        uptime: this.calculateUptime(metrics),
        details: {
          reason: this.getFailureReason(error),
          suggestion: this.getSuggestion(systemKey, error),
        },
      };
    }
  }

  /**
   * Perform actual health check with retry logic
   */
  async performHealthCheck(system, retryCount = 0) {
    try {
      const url = `${system.endpoint}${system.healthCheck}`;
      const response = await axios.get(url, {
        timeout: system.timeout,
      });

      return response.data || { status: 'ok' };
    } catch (error) {
      if (retryCount < system.retries) {
        // Wait before retrying
        await this.delay(1000);
        return this.performHealthCheck(system, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Check integration with custom payload verification
   */
  async checkIntegrationWithPayload(systemKey, payload) {
    const system = this.integrations[systemKey];
    const startTime = Date.now();

    try {
      const response = await axios.post(`${system.endpoint}/api/verify`, payload, {
        timeout: system.timeout,
      });

      const responseTime = Date.now() - startTime;

      return {
        system: systemKey,
        status: 'healthy',
        verified: response.data.verified || false,
        responseTime,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        system: systemKey,
        status: 'unhealthy',
        verified: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed integration metrics
   */
  async getIntegrationMetrics(systemKey) {
    const system = this.integrations[systemKey];
    const metrics = this.integrationMetrics[systemKey];

    const health = await this.checkIntegrationHealth(systemKey);

    return {
      system: systemKey,
      name: system.name,
      status: health.status,
      metrics: {
        lastCheck: metrics.lastCheck,
        uptime: this.calculateUptime(metrics),
        failureCount: metrics.failureCount,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        failureRate: this.calculateFailureRate(metrics),
        healthScore: this.calculateHealthScore(health, metrics),
      },
      endpoint: system.endpoint,
      lastCheckResult: health,
    };
  }

  /**
   * Get integration statistics for all systems
   */
  async getIntegrationStatistics() {
    const stats = {};
    const systemKeys = Object.keys(this.integrations);

    for (const key of systemKeys) {
      stats[key] = await this.getIntegrationMetrics(key);
    }

    return {
      timestamp: new Date().toISOString(),
      totalSystems: systemKeys.length,
      healthySystems: Object.values(stats).filter(s => s.status === 'healthy').length,
      unhealthySystems: Object.values(stats).filter(s => s.status === 'unhealthy').length,
      overallStatus: this.getOverallStatus(stats),
      integrations: stats,
      systemUptimes: this.generateUptimeReport(stats),
    };
  }

  /**
   * Test data synchronization between systems
   */
  async testDataSync(systemKey, testData) {
    const system = this.integrations[systemKey];

    try {
      const response = await axios.post(`${system.endpoint}/api/data-sync/test`, testData, {
        timeout: system.timeout,
      });

      return {
        system: systemKey,
        status: 'success',
        syncTest: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        system: systemKey,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get integration diagnostic information
   */
  async getDiagnostics(systemKey) {
    const system = this.integrations[systemKey];
    const metrics = this.integrationMetrics[systemKey];
    const health = await this.checkIntegrationHealth(systemKey);

    return {
      system: systemKey,
      name: system.name,
      configuration: {
        endpoint: system.endpoint,
        healthCheckUrl: `${system.endpoint}${system.healthCheck}`,
        timeout: system.timeout,
        retries: system.retries,
      },
      currentStatus: health,
      metrics: {
        lastCheck: metrics.lastCheck,
        uptime: this.calculateUptime(metrics),
        failureCount: metrics.failureCount,
        averageResponseTime: metrics.averageResponseTime,
      },
      recommendations: this.generateRecommendations(health, metrics),
    };
  }

  /**
   * Helper: Aggregate status from multiple checks
   */
  aggregateStatus(checks) {
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    if (healthyCount === checks.length) return 'healthy';
    if (healthyCount >= checks.length / 2) return 'degraded';
    return 'critical';
  }

  /**
   * Helper: Get overall integration status
   */
  getOverallStatus(stats) {
    const statuses = Object.values(stats).map(s => s.status);
    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const totalCount = statuses.length;

    if (healthyCount === totalCount) return 'all_healthy';
    if (healthyCount === 0) return 'all_failed';
    return 'partially_healthy';
  }

  /**
   * Helper: Generate summary
   */
  generateSummary(checks) {
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;

    return {
      total: checks.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      percentage: Math.round((healthyCount / checks.length) * 100),
    };
  }

  /**
   * Helper: Calculate uptime percentage
   */
  calculateUptime(metrics) {
    if (!metrics.lastCheck) return 100;
    const totalTime = Date.now() - this.startTime;
    const failureTime = metrics.failureCount * 300; // Assume each failure takes ~5 minutes
    return Math.max(0, Math.round(((totalTime - failureTime) / totalTime) * 100));
  }

  /**
   * Helper: Calculate failure rate
   */
  calculateFailureRate(metrics) {
    return metrics.failureCount > 0 ? (metrics.failureCount / 100) * 100 : 0;
  }

  /**
   * Helper: Calculate health score
   */
  calculateHealthScore(health, metrics) {
    let score = 100;

    if (health.status === 'unhealthy') {
      score -= 50;
    }

    score -= (metrics.failureCount * 2);
    if (metrics.averageResponseTime > 1000) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper: Get failure reason
   */
  getFailureReason(error) {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused - Service may be offline';
    }
    if (error.code === 'ENOTFOUND') {
      return 'Host not found - DNS or network issue';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Request timeout - Service is slow or unresponsive';
    }
    if (error.response?.status === 503) {
      return 'Service unavailable - Maintenance or overload';
    }
    return error.message || 'Unknown error';
  }

  /**
   * Helper: Get suggestion for fixing issues
   */
  getSuggestion(systemKey, error) {
    const suggestions = {
      finance: 'Check Finance System service health and network connectivity',
      academics: 'Check Academics System service health and network connectivity',
      exams: 'Check Exams System service health and network connectivity',
    };

    const baseMsg = suggestions[systemKey] || 'Check system health and connectivity';

    if (error.code === 'ECONNREFUSED') {
      return `${baseMsg}. Ensure the service is running.`;
    }
    if (error.code === 'ENOTFOUND') {
      return `${baseMsg}. Verify the endpoint URL is correct.`;
    }
    if (error.code === 'ETIMEDOUT') {
      return `${baseMsg}. The service may be experiencing high load.`;
    }

    return baseMsg;
  }

  /**
   * Helper: Generate uptime report
   */
  generateUptimeReport(stats) {
    const report = {};
    Object.entries(stats).forEach(([key, stat]) => {
      report[key] = {
        name: stat.name,
        uptime: `${stat.metrics.uptime}%`,
        lastCheck: stat.metrics.lastCheck,
      };
    });
    return report;
  }

  /**
   * Helper: Generate recommendations
   */
  generateRecommendations(health, metrics) {
    const recommendations = [];

    if (health.status === 'unhealthy') {
      recommendations.push(`System is currently ${health.status}. Investigate connection issues.`);
    }

    if (metrics.averageResponseTime > 1000) {
      recommendations.push('Response time is high. Consider checking system load and network.');
    }

    if (metrics.failureCount > 5) {
      recommendations.push('Multiple failures detected. Review system logs for errors.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally.');
    }

    return recommendations;
  }

  /**
   * Helper: Delay function for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new IntegrationChecker();
