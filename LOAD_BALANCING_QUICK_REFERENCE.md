# Load Balancing Quick Reference Guide

## Quick Start

### 1. Check System Load
```bash
curl http://localhost:5000/api/load-balance/status
```

### 2. Check Specific Service Load
```bash
curl http://localhost:5000/api/load-balance/service/Finance
```

### 3. Find Best Counter for Ticket
```bash
curl "http://localhost:5000/api/load-balance/best-counter?serviceType=Finance&priority=high"
```

### 4. Get All Counters by Load
```bash
curl "http://localhost:5000/api/load-balance/counters-by-load?serviceType=Finance"
```

## Admin Operations

### Auto-Assign Next Waiting Ticket
```bash
curl -X POST http://localhost:5000/api/load-balance/auto-assign \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceType":"Finance"}'
```

### Rebalance Service Queue
```bash
curl -X POST http://localhost:5000/api/load-balance/rebalance/Finance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Load Recommendations
```bash
curl http://localhost:5000/api/load-balance/recommendations \
  -H "Authorization: Bearer YOUR_STAFF_TOKEN"
```

### Get Optimization Insights
```bash
curl http://localhost:5000/api/load-balance/insights \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Real-Time Monitoring

### JavaScript Socket.IO Example
```javascript
const socket = io("http://localhost:5000");

// Connect to service queue
socket.emit("joinServiceQueue", { serviceType: "Finance" });

// Listen for load updates every 10 seconds
socket.on("loadMetricsUpdated", (data) => {
  console.log("System avg load:", data.summary.avgLoadScore + "%");
  console.log("Total waiting:", data.summary.totalQueueLength);
});

// Listen for service-specific updates
socket.on("service-load-updated", (data) => {
  console.log(`Finance load: ${data.avgLoad}%`);
  console.log("Counters:", data.counterMetrics);
});

// Listen for ticket assignments
socket.on("counter-assigned-ticket", (data) => {
  console.log(`Ticket #${data.ticket.ticketNumber} → ${data.counter.counterName}`);
});

// Listen for rebalancing
socket.on("queue-rebalanced", (data) => {
  console.log(`Rebalance complete: ${data.result.ticketsAssigned} assigned`);
});
```

## Load Score Interpretation

| Load Score | Status | Meaning |
|-----------|--------|---------|
| 0-20 | Green | Idle/Underutilized |
| 20-40 | Light Green | Healthy, ready for more |
| 40-60 | Yellow | Normal operation |
| 60-80 | Orange | Getting busy, monitor |
| 80-100 | Red | Overloaded or unavailable |

## Response Templates

### Status Response
```json
{
  "summary": {
    "totalCounters": 15,
    "availableCounters": 12,
    "busyCounters": 8,
    "totalQueueLength": 23,
    "avgLoadScore": 45,
    "systemLoad": "moderate"
  },
  "counterMetrics": [...]
}
```

### Best Counter Response
```json
{
  "recommendation": {
    "counterId": "507f1f77bcf86cd799439011",
    "counterName": "Finance Counter 2",
    "currentLoad": 25,
    "estimatedWaitTime": "3 minutes"
  }
}
```

### Auto-Assign Response
```json
{
  "message": "Ticket auto-assigned to optimal counter",
  "ticket": {
    "id": "507f1f77bcf86cd799439012",
    "ticketNumber": 42,
    "status": "serving"
  },
  "assignedCounter": {
    "counterName": "Finance Counter 1",
    "loadScore": 30
  }
}
```

## Common Tasks

### Monitor Peak Hours
1. Open admin dashboard
2. Watch `loadMetricsUpdated` events
3. Set alert threshold at 70% avg load
4. Have staff on standby

### Identify Bottlenecks
```bash
# Get insights
curl http://localhost:5000/api/load-balance/insights \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq '.insights.bottlenecks'

# Check service analysis
curl http://localhost:5000/api/load-balance/insights \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq '.insights.serviceAnalysis'
```

### Redistribute Overloaded Counters
```bash
# Get recommendations
curl http://localhost:5000/api/load-balance/recommendations \
  -H "Authorization: Bearer STAFF_TOKEN"

# Trigger rebalancing
curl -X POST http://localhost:5000/api/load-balance/rebalance/Finance \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Prepare for Expected Surge
1. Check current load: `GET /status`
2. Get insights: `GET /insights`
3. Increase staff: `PUT /api/counters/{id}/assign-staff`
4. Open additional counters if needed
5. Monitor: Listen to Socket.IO `loadMetricsUpdated` events

## Troubleshooting Checklist

- [ ] Check counter availability: `GET /api/load-balance/service/{serviceType}`
- [ ] Verify no counters under maintenance: `GET /api/counters`
- [ ] Ensure staff assigned: `GET /api/counters/assignments/all`
- [ ] Check waiting tickets: `GET /api/tickets?status=waiting`
- [ ] Review load metrics: `GET /api/load-balance/status`
- [ ] Get recommendations: `GET /api/load-balance/recommendations`
- [ ] Trigger rebalance: `POST /api/load-balance/rebalance/{serviceType}`

## Integration Points

### With Ticket Creation
Automatically uses load balancing when ticket created:
- Ticket priority determined from user attributes
- Best counter found based on service type + priority
- Counter assigned without manual intervention

### With Staff Management
Works with counter staff assignments:
- Considers assigned staff competency
- Updates when staff reassigned
- Affects load calculations

### With Availability Tracking
Integrates with counter availability:
- Excludes unavailable/maintenance counters
- Updates load when status changes
- Suggests alternatives when counter unavailable

## Performance Tips

1. **Reduce Monitor Interval for Live Dashboards**
   - Default: 10 seconds
   - Live view: 5 seconds
   - Reports: 30 seconds

2. **Cache Load Data**
   - Cache for 2-5 seconds
   - Reduces database queries
   - Still provides real-time feel

3. **Filter Socket.IO Updates**
   - Only listen to relevant services
   - Reduces network traffic
   - Faster client-side updates

4. **Batch Auto-Assignments**
   - Assign 5-10 tickets per batch
   - More efficient than one-by-one
   - Better queue distribution

## API Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Missing/invalid parameters |
| 401 | Authentication required |
| 403 | Authorization failed (staff/admin required) |
| 404 | Counter/service not found or no tickets available |
| 500 | Server error |

## Features at a Glance

✅ Real-time load monitoring
✅ Intelligent counter selection
✅ Auto-ticket assignment
✅ Queue rebalancing
✅ Bottleneck identification
✅ Optimization recommendations
✅ Service-level analytics
✅ System health status
✅ Socket.IO real-time events
✅ Admin dashboard data
✅ Staff recommendations
✅ Peak hour alerts
