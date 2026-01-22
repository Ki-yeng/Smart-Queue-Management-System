# System Health Status Endpoint Documentation

## Overview

The System Health Status endpoint provides comprehensive monitoring of your Smart Queue Management System. It tracks database connectivity, system performance, service availability, and queue metrics in real-time.

## Features

✅ **Database Health Monitoring** - MongoDB connection status and performance
✅ **Performance Metrics** - Memory usage, CPU utilization, system load
✅ **Service Availability** - Status of all API services
✅ **Queue Metrics** - Ticket counts, wait times, counter occupancy
✅ **System Uptime** - Server uptime tracking
✅ **Health Scoring** - Overall system health score (0-100)

## Available Endpoints

### 1. Simple Health Check
```
GET /api/health
```

**Description:** Quick health check (no dependencies)

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 2. Comprehensive System Health
```
GET /api/health/status
```

**Description:** Complete system health report with all components

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "status": "healthy",
  "healthScore": 95,
  "uptime": {
    "milliseconds": 3600000,
    "formatted": "1h 0m 0s",
    "processUptime": 3600.5
  },
  "checkDuration": 125,
  "components": {
    "database": {
      "status": "healthy",
      "connected": true,
      "responseTime": 2,
      "database": "kcau-queue",
      "host": "localhost"
    },
    "memory": {
      "status": "healthy",
      "totalMemory": "16 GB",
      "usedMemory": "4.5 GB",
      "freeMemory": "11.5 GB",
      "usagePercent": 28.1,
      "heapUsed": "120 MB",
      "heapTotal": "256 MB",
      "external": "12 MB",
      "rss": "150 MB"
    },
    "cpu": {
      "status": "healthy",
      "usagePercent": 35,
      "cores": 8,
      "loadAverage": {
        "oneMinute": 1.2,
        "fiveMinutes": 1.5,
        "fifteenMinutes": 1.3
      },
      "model": "Intel Core i7"
    },
    "services": {
      "status": "healthy",
      "services": {
        "Auth Service": { "status": "available", "endpoint": "/api/auth" },
        "Tickets Service": { "status": "available", "endpoint": "/api/tickets" },
        "Counters Service": { "status": "available", "endpoint": "/api/counters" },
        "Dashboard Service": { "status": "available", "endpoint": "/api/dashboard" },
        "Users Service": { "status": "available", "endpoint": "/api/users" }
      }
    }
  },
  "metrics": {
    "requestCount": 15420,
    "errorCount": 5,
    "errorRate": 0.03
  }
}
```

### 3. Database Health
```
GET /api/health/database
```

**Description:** Detailed database connection and statistics

**Response:**
```json
{
  "status": "healthy",
  "connection": {
    "status": "healthy",
    "connected": true,
    "responseTime": 2,
    "database": "kcau-queue",
    "host": "localhost"
  },
  "collections": {
    "tickets": 1250,
    "counters": 15,
    "users": 345
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Status Values:**
- `healthy` - Database connected and responding normally
- `disconnected` - Connection lost (readyState != 1)
- `unhealthy` - Connection error or unreachable

### 4. Service Availability
```
GET /api/health/services
```

**Description:** Status of all API services

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "Auth Service": {
      "status": "available",
      "endpoint": "/api/auth"
    },
    "Tickets Service": {
      "status": "available",
      "endpoint": "/api/tickets"
    },
    "Counters Service": {
      "status": "available",
      "endpoint": "/api/counters"
    },
    "Dashboard Service": {
      "status": "available",
      "endpoint": "/api/dashboard"
    },
    "Users Service": {
      "status": "available",
      "endpoint": "/api/users"
    }
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 5. Performance Metrics
```
GET /api/health/metrics
```

**Description:** System performance metrics (memory, CPU, requests)

**Response:**
```json
{
  "memory": {
    "status": "healthy",
    "totalMemory": "16 GB",
    "usedMemory": "4.5 GB",
    "freeMemory": "11.5 GB",
    "usagePercent": 28.1,
    "heapUsed": "120 MB",
    "heapTotal": "256 MB",
    "external": "12 MB",
    "rss": "150 MB"
  },
  "cpu": {
    "status": "healthy",
    "usagePercent": 35,
    "cores": 8,
    "loadAverage": {
      "oneMinute": 1.2,
      "fiveMinutes": 1.5,
      "fifteenMinutes": 1.3
    },
    "model": "Intel Core i7"
  },
  "application": {
    "requestCount": 15420,
    "errorCount": 5,
    "errorRate": 0.03,
    "uptime": 3600000
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Memory Status:**
- `healthy` - < 75% usage
- `warning` - 75-90% usage
- `critical` - > 90% usage

**CPU Status:**
- `healthy` - < 75% usage
- `warning` - 75-90% usage
- `critical` - > 90% usage

### 6. Queue Health Metrics
```
GET /api/health/queue
```

**Description:** Queue and counter statistics

**Response:**
```json
{
  "tickets": {
    "total": 1250,
    "served": 950,
    "waiting": 150,
    "processing": 20,
    "avgWaitTimeMs": 180000
  },
  "counters": {
    "total": 15,
    "active": 14,
    "inactive": 1,
    "avgOccupancy": 8
  },
  "health": {
    "queueStatus": "normal",
    "allCountersActive": false
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Queue Status:**
- `normal` - Waiting tickets ≤ 20
- `busy` - Waiting tickets > 20

### 7. Server Uptime
```
GET /api/health/uptime
```

**Description:** Server uptime information

**Response:**
```json
{
  "uptime": {
    "milliseconds": 3600000,
    "formatted": "1h 0m 0s",
    "processUptime": 3600.5
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Health Score Calculation

The overall health score (0-100) is calculated based on:

| Component | Healthy | Warning | Critical |
|-----------|---------|---------|----------|
| Database | -0 points | -30 points | -50 points |
| Memory | -0 points | -15 points | -35 points |
| CPU | -0 points | -15 points | -35 points |
| Services | -0 points (100%) | -20 points (75%) | -40 points (< 50%) |

**Health Status Thresholds:**
- 90-100: `healthy` ✅
- 70-89: `degraded` ⚠️
- 50-69: `warning` ⚠️
- 0-49: `critical` 🔴

## Usage Examples

### Check Overall System Health
```bash
curl http://localhost:5000/api/health/status
```

### Monitor Queue Load
```bash
curl http://localhost:5000/api/health/queue
```

### Check Database Performance
```bash
curl http://localhost:5000/api/health/database
```

### Monitor Memory Usage
```bash
curl http://localhost:5000/api/health/metrics | jq '.memory'
```

### Health Check in Frontend
```javascript
// In your frontend application
async function checkSystemHealth() {
  try {
    const response = await fetch('http://localhost:5000/api/health/status');
    const health = await response.json();
    
    if (health.healthScore < 70) {
      console.warn('System health degraded:', health);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Check every 30 seconds
setInterval(checkSystemHealth, 30000);
```

### Health Check in Backend
```javascript
const healthChecker = require('./utils/healthChecker');

async function monitorSystem() {
  const health = await healthChecker.getSystemHealth();
  
  if (health.components.memory.status === 'critical') {
    // Send alert
    console.error('ALERT: Critical memory usage!');
  }
}
```

## Monitoring and Alerting

### Recommended Alert Thresholds

1. **Database Down**
   - Condition: `database.status !== "healthy"`
   - Action: Page on-call team immediately

2. **Critical Memory Usage**
   - Condition: `memory.status === "critical"`
   - Action: Restart services or scale up

3. **High Error Rate**
   - Condition: `errorRate > 0.05` (5%)
   - Action: Investigate logs and service status

4. **Queue Buildup**
   - Condition: `tickets.waiting > 100`
   - Action: Add counters or notify operations team

5. **Service Degradation**
   - Condition: `healthScore < 70`
   - Action: Investigate and take corrective action

## Integration with Monitoring Tools

The health endpoints integrate with popular monitoring tools:

### Prometheus Integration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'queue-system'
    metrics_path: '/api/health/metrics'
    static_configs:
      - targets: ['localhost:5000']
```

### Grafana Dashboards
Create a new dashboard and use these data sources:
- `/api/health/status` - Overall health
- `/api/health/metrics` - Performance metrics
- `/api/health/queue` - Queue metrics
- `/api/health/database` - Database metrics

### ELK Stack
Send health check data to Elasticsearch:
```javascript
const { createLogger, transports } = require('winston');
const elasticsearch = require('winston-elasticsearch');

const esTransport = new elasticsearch.ElasticsearchTransport({
  level: 'info',
  clientOpts: { node: 'http://localhost:9200' },
});

const logger = createLogger({
  transports: [esTransport],
});
```

## Error Handling

All health endpoints include error handling:

**Error Response Example:**
```json
{
  "status": "error",
  "message": "Failed to retrieve system health",
  "error": "MongoDB connection timeout"
}
```

## Performance Considerations

- Health checks are optimized to complete in < 200ms
- Database pings use connection pool (no new connections)
- CPU usage calculated from os.cpus() (no system calls)
- Memory metrics from os.freemem() and process.memoryUsage()

## File Structure

```
backend/src/
├── utils/
│   └── healthChecker.js        # Health monitoring utility
├── controllers/
│   └── healthController.js     # Health endpoint handlers
├── routes/
│   └── healthRoutes.js         # Health route definitions
└── index.js                    # Updated to use health routes
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial health status endpoint |
| | | - Database monitoring |
| | | - Performance metrics |
| | | - Service availability |
| | | - Queue metrics |
| | | - Health scoring |

---

**For more information on system monitoring, see:**
- [KPI Implementation](./KPI_IMPLEMENTATION_GUIDE.md)
- [Load Balancing Monitor](./LOAD_BALANCING_GUIDE.md)
- [Dashboard Metrics](./DASHBOARD_KPI_GUIDE.md)
