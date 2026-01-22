# Health Status API - Endpoint Reference

## Base URL
```
http://localhost:5000/api/health
```

## All Endpoints

### 1. Simple Health Check
```http
GET /api/health
```
**Purpose:** Quick health check (no dependencies)  
**Response Time:** < 5ms  
**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

---

### 2. Complete System Health Status
```http
GET /api/health/status
```
**Purpose:** Comprehensive system health report with all components  
**Response Time:** < 200ms  
**Auth Required:** No

**Response:**
```json
{
  "timestamp": "2024-01-20T12:44:48.123Z",
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

---

### 3. Database Health
```http
GET /api/health/database
```
**Purpose:** Detailed database connection and statistics  
**Response Time:** < 100ms  
**Auth Required:** No

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
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

**Status Values:**
- `healthy` - Database connected and responding normally
- `disconnected` - Connection lost
- `unhealthy` - Connection error or unreachable

---

### 4. Service Availability
```http
GET /api/health/services
```
**Purpose:** Status of all API services  
**Response Time:** < 50ms  
**Auth Required:** No

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
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

**Service Status:**
- `available` - Service is responding
- `unavailable` - Service is not responding

---

### 5. Performance Metrics
```http
GET /api/health/metrics
```
**Purpose:** System performance metrics (memory, CPU, requests)  
**Response Time:** < 100ms  
**Auth Required:** No

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
  "timestamp": "2024-01-20T12:44:48.123Z"
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

---

### 6. Queue Health Metrics
```http
GET /api/health/queue
```
**Purpose:** Queue and counter statistics  
**Response Time:** < 150ms  
**Auth Required:** No

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
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

**Queue Status:**
- `normal` - Waiting tickets ≤ 20
- `busy` - Waiting tickets > 20

---

### 7. Server Uptime
```http
GET /api/health/uptime
```
**Purpose:** Server uptime information  
**Response Time:** < 5ms  
**Auth Required:** No

**Response:**
```json
{
  "uptime": {
    "milliseconds": 3600000,
    "formatted": "1h 0m 0s",
    "processUptime": 3600.5
  },
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

---

## Endpoint Summary Table

| # | Endpoint | Method | Purpose | Response Time | Auth |
|---|----------|--------|---------|---|---|
| 1 | `/api/health` | GET | Simple health check | < 5ms | No |
| 2 | `/api/health/status` | GET | Complete system health | < 200ms | No |
| 3 | `/api/health/database` | GET | Database details | < 100ms | No |
| 4 | `/api/health/services` | GET | Service availability | < 50ms | No |
| 5 | `/api/health/metrics` | GET | Performance metrics | < 100ms | No |
| 6 | `/api/health/queue` | GET | Queue statistics | < 150ms | No |
| 7 | `/api/health/uptime` | GET | Server uptime | < 5ms | No |

---

## cURL Examples

### Test All Endpoints
```bash
# 1. Simple check
curl http://localhost:5000/api/health

# 2. Complete status
curl http://localhost:5000/api/health/status

# 3. Database health
curl http://localhost:5000/api/health/database

# 4. Service status
curl http://localhost:5000/api/health/services

# 5. Performance metrics
curl http://localhost:5000/api/health/metrics

# 6. Queue metrics
curl http://localhost:5000/api/health/queue

# 7. Server uptime
curl http://localhost:5000/api/health/uptime
```

### Pretty Print JSON
```bash
# View formatted response
curl http://localhost:5000/api/health/status | jq '.'

# Get just the health score
curl http://localhost:5000/api/health/status | jq '.healthScore'

# Get memory usage
curl http://localhost:5000/api/health/metrics | jq '.memory.usagePercent'

# Get queue wait time
curl http://localhost:5000/api/health/queue | jq '.tickets.avgWaitTimeMs'

# Get database status
curl http://localhost:5000/api/health/database | jq '.connection.status'
```

### Continuous Monitoring
```bash
# Watch health status every 5 seconds
watch -n 5 'curl -s http://localhost:5000/api/health/status | jq .'

# Check specific metric every 10 seconds
watch -n 10 'curl -s http://localhost:5000/api/health/metrics | jq ".memory.usagePercent"'

# Monitor queue length every 3 seconds
watch -n 3 'curl -s http://localhost:5000/api/health/queue | jq ".tickets.waiting"'
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Failed to retrieve system health",
  "error": "MongoDB connection timeout",
  "timestamp": "2024-01-20T12:44:48.123Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Successful request
- `500 Internal Server Error` - Server error or dependency failure

---

## Response Time Guidelines

| Endpoint | Target | Status |
|----------|--------|--------|
| `/api/health` | < 5ms | ✅ |
| `/api/health/status` | < 200ms | ✅ |
| `/api/health/database` | < 100ms | ✅ |
| `/api/health/services` | < 50ms | ✅ |
| `/api/health/metrics` | < 100ms | ✅ |
| `/api/health/queue` | < 150ms | ✅ |
| `/api/health/uptime` | < 5ms | ✅ |

---

## JavaScript/Fetch Examples

### React Component
```javascript
import { useEffect, useState } from 'react';

function HealthStatus() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch('/api/health/status');
        const data = await response.json();
        setHealth(data);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!health) return <div>Loading...</div>;

  return (
    <div>
      <h2>System Health</h2>
      <p>Status: {health.status}</p>
      <p>Score: {health.healthScore}/100</p>
      <p>Memory: {health.components.memory.usagePercent}%</p>
    </div>
  );
}
```

### Node.js/Backend
```javascript
async function checkHealth() {
  try {
    const response = await fetch('http://localhost:5000/api/health/status');
    const health = await response.json();
    
    console.log('Health Score:', health.healthScore);
    console.log('Status:', health.status);
    
    if (health.healthScore < 50) {
      console.error('CRITICAL: System health issue!');
      // Take action
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Check every minute
setInterval(checkHealth, 60000);
```

---

## Health Score Reference

| Score Range | Status | Color | Action |
|---|---|---|---|
| 90-100 | Healthy | 🟢 Green | Monitor normally |
| 70-89 | Degraded | 🟡 Yellow | Investigate |
| 50-69 | Warning | 🟠 Orange | Take action |
| 0-49 | Critical | 🔴 Red | Emergency response |

---

## Documentation Links

- [Full Documentation](./HEALTH_STATUS_GUIDE.md)
- [Quick Reference](./HEALTH_STATUS_QUICK_REFERENCE.md)
- [Implementation Details](./HEALTH_STATUS_IMPLEMENTATION.md)
- [Overview](./HEALTH_STATUS_OVERVIEW.md)
- [Checklist](./HEALTH_STATUS_CHECKLIST.md)

---

**Last Updated:** January 20, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
