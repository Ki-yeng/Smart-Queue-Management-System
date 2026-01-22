# Health Status Quick Reference

## API Endpoints Summary

| Endpoint | Method | Purpose | Response Time |
|----------|--------|---------|---|
| `/api/health` | GET | Simple ping check | < 5ms |
| `/api/health/status` | GET | Complete system health | < 200ms |
| `/api/health/database` | GET | Database details & stats | < 100ms |
| `/api/health/services` | GET | Service availability | < 50ms |
| `/api/health/metrics` | GET | Performance metrics | < 100ms |
| `/api/health/queue` | GET | Queue statistics | < 150ms |
| `/api/health/uptime` | GET | Server uptime | < 5ms |

## One-Liners

```bash
# Check if system is healthy
curl http://localhost:5000/api/health

# Get complete status
curl http://localhost:5000/api/health/status | jq '.status'

# Get health score
curl http://localhost:5000/api/health/status | jq '.healthScore'

# Check database
curl http://localhost:5000/api/health/database | jq '.connection.status'

# Check memory
curl http://localhost:5000/api/health/metrics | jq '.memory.usagePercent'

# Check queue
curl http://localhost:5000/api/health/queue | jq '.tickets.waiting'

# Check uptime
curl http://localhost:5000/api/health/uptime | jq '.uptime.formatted'
```

## Status Meanings

### Health Score
- **90-100** ✅ Healthy
- **70-89** ⚠️ Degraded
- **50-69** ⚠️ Warning
- **0-49** 🔴 Critical

### Component Status
- **healthy** - All systems operational
- **warning** - Some performance issues
- **critical** - Urgent action needed
- **disconnected** - Service unavailable
- **unavailable** - Cannot reach service

## Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Memory | < 75% | 75-90% | > 90% |
| CPU | < 75% | 75-90% | > 90% |
| Error Rate | < 1% | 1-5% | > 5% |
| DB Response | < 50ms | 50-200ms | > 200ms |
| Queue Wait | < 300s | 300-600s | > 600s |
| Waiting Tickets | < 20 | 20-50 | > 50 |

## Frontend Integration

```javascript
// Check health on app startup
useEffect(() => {
  checkSystemHealth();
}, []);

async function checkSystemHealth() {
  try {
    const response = await fetch('/api/health/status');
    const health = await response.json();
    
    if (health.healthScore < 70) {
      showWarningBanner('System performance degraded');
    }
  } catch (error) {
    console.error('Health check failed');
  }
}
```

## Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
```

## Kubernetes Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/status
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Common Issues & Solutions

**Problem: Database Status = "disconnected"**
- ✅ Check MongoDB is running
- ✅ Verify MONGO_URI in .env
- ✅ Check firewall/network connectivity

**Problem: Memory Status = "critical"**
- ✅ Restart the application
- ✅ Check for memory leaks
- ✅ Scale up server resources

**Problem: High Error Rate**
- ✅ Check application logs
- ✅ Verify database connectivity
- ✅ Check external service dependencies

**Problem: Queue Buildup**
- ✅ Activate more counters
- ✅ Check counter staff availability
- ✅ Monitor for bottlenecks

## Implementation Files

```
Created Files:
✅ backend/src/utils/healthChecker.js      - Health monitoring utility
✅ backend/src/controllers/healthController.js - Endpoint handlers
✅ backend/src/routes/healthRoutes.js      - Route definitions

Modified Files:
✅ backend/src/index.js                    - Register health routes
```

## Testing

```bash
# Test all endpoints
npm test -- health

# Manual testing
node -e "
const health = require('./src/utils/healthChecker');
health.getSystemHealth().then(h => console.log(JSON.stringify(h, null, 2)));
"

# Continuous monitoring
watch -n 5 'curl -s http://localhost:5000/api/health/status | jq .'
```

## Troubleshooting

**Health endpoint returns 404**
- ✅ Verify server is running: `curl http://localhost:5000/api/health`
- ✅ Check routes are registered in index.js
- ✅ Verify no route conflicts

**Endpoints timeout**
- ✅ Check network connectivity
- ✅ Verify MongoDB is responsive
- ✅ Check server CPU/memory

**Inaccurate metrics**
- ✅ Health checks are point-in-time snapshots
- ✅ Call multiple times for trends
- ✅ Use monitoring tools for continuous data

---

**Full documentation:** See [HEALTH_STATUS_GUIDE.md](./HEALTH_STATUS_GUIDE.md)
