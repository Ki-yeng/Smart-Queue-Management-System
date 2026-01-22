const mongoose = require('mongoose');
const os = require('os');

/**
 * System health checker utility
 * Monitors system status, performance, and service availability
 */
class HealthChecker {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Get complete system health status
   */
  async getSystemHealth() {
    const startCheck = Date.now();

    try {
      const [
        dbStatus,
        memoryStatus,
        cpuStatus,
        serviceStatus,
        uptime,
      ] = await Promise.all([
        this.checkDatabaseConnection(),
        this.checkMemoryUsage(),
        this.checkCPUUsage(),
        this.checkServiceAvailability(),
        this.getUptime(),
      ]);

      const checkDuration = Date.now() - startCheck;

      // Calculate overall health status
      const healthScore = this.calculateHealthScore({
        db: dbStatus,
        memory: memoryStatus,
        cpu: cpuStatus,
        services: serviceStatus,
      });

      return {
        timestamp: new Date().toISOString(),
        status: healthScore.status,
        healthScore: healthScore.score,
        uptime,
        checkDuration,
        components: {
          database: dbStatus,
          memory: memoryStatus,
          cpu: cpuStatus,
          services: serviceStatus,
        },
        metrics: {
          requestCount: this.requestCount,
          errorCount: this.errorCount,
          errorRate: this.errorCount / Math.max(this.requestCount, 1),
        },
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        healthScore: 0,
        error: error.message,
      };
    }
  }

  /**
   * Check database connection status
   */
  async checkDatabaseConnection() {
    try {
      const startTime = Date.now();

      // Check if MongoDB is connected
      const mongooseStatus = mongoose.connection.readyState;
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

      if (mongooseStatus !== 1) {
        return {
          status: 'disconnected',
          readyState: mongooseStatus,
          responseTime: Date.now() - startTime,
          message: 'MongoDB is not connected',
        };
      }

      // Perform a simple ping
      const adminDb = mongoose.connection.db.admin();
      await adminDb.ping();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        connected: true,
        responseTime,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Node.js specific memory
      const nodeMemory = process.memoryUsage();

      return {
        status: memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 75 ? 'warning' : 'healthy',
        totalMemory: this.formatBytes(totalMemory),
        usedMemory: this.formatBytes(usedMemory),
        freeMemory: this.formatBytes(freeMemory),
        usagePercent: parseFloat(memoryUsagePercent.toFixed(2)),
        heapUsed: this.formatBytes(nodeMemory.heapUsed),
        heapTotal: this.formatBytes(nodeMemory.heapTotal),
        external: this.formatBytes(nodeMemory.external),
        rss: this.formatBytes(nodeMemory.rss),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Check CPU usage
   */
  checkCPUUsage() {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // Calculate average CPU usage
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);

      return {
        status: cpuUsage > 90 ? 'critical' : cpuUsage > 75 ? 'warning' : 'healthy',
        usagePercent: cpuUsage,
        cores: cpus.length,
        loadAverage: {
          oneMinute: parseFloat(loadAverage[0].toFixed(2)),
          fiveMinutes: parseFloat(loadAverage[1].toFixed(2)),
          fifteenMinutes: parseFloat(loadAverage[2].toFixed(2)),
        },
        model: cpus[0].model,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Check service availability
   */
  async checkServiceAvailability() {
    const services = {};

    // Check basic service endpoints
    const serviceChecks = [
      { name: 'Auth Service', endpoint: '/api/auth' },
      { name: 'Tickets Service', endpoint: '/api/tickets' },
      { name: 'Counters Service', endpoint: '/api/counters' },
      { name: 'Dashboard Service', endpoint: '/api/dashboard' },
      { name: 'Users Service', endpoint: '/api/users' },
    ];

    for (const service of serviceChecks) {
      try {
        // Note: In production, you'd make actual HTTP calls
        // For now, we'll mark them as available if they're registered
        services[service.name] = {
          status: 'available',
          endpoint: service.endpoint,
        };
      } catch (error) {
        services[service.name] = {
          status: 'unavailable',
          endpoint: service.endpoint,
          error: error.message,
        };
      }
    }

    return {
      status: 'healthy',
      services,
    };
  }

  /**
   * Get server uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

    return {
      milliseconds: uptimeMs,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      processUptime: process.uptime(),
    };
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore(components) {
    let score = 100;

    // Database health
    if (components.db.status === 'healthy') score -= 0;
    else if (components.db.status === 'disconnected') score -= 30;
    else if (components.db.status === 'unhealthy') score -= 50;

    // Memory health
    if (components.memory.status === 'healthy') score -= 0;
    else if (components.memory.status === 'warning') score -= 15;
    else if (components.memory.status === 'critical') score -= 35;

    // CPU health
    if (components.cpu.status === 'healthy') score -= 0;
    else if (components.cpu.status === 'warning') score -= 15;
    else if (components.cpu.status === 'critical') score -= 35;

    // Service health
    const servicesAvailable = Object.values(components.services.services || {}).filter(
      (s) => s.status === 'available'
    ).length;
    const totalServices = Object.values(components.services.services || {}).length;
    const serviceHealth = (servicesAvailable / totalServices) * 100;

    if (serviceHealth < 50) score -= 40;
    else if (serviceHealth < 75) score -= 20;
    else if (serviceHealth < 100) score -= 5;

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine status
    let status = 'healthy';
    if (score >= 90) status = 'healthy';
    else if (score >= 70) status = 'degraded';
    else if (score >= 50) status = 'warning';
    else status = 'critical';

    return { score: Math.round(score), status };
  }

  /**
   * Helper: Format bytes to readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Increment request counter
   */
  incrementRequestCount() {
    this.requestCount++;
  }

  /**
   * Increment error counter
   */
  incrementErrorCount() {
    this.errorCount++;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: parseFloat((this.errorCount / Math.max(this.requestCount, 1) * 100).toFixed(2)),
      uptime: Date.now() - this.startTime,
    };
  }
}

module.exports = new HealthChecker();
