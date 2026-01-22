# Real-Time Counter Load Balancing Implementation

## Overview

This document describes the comprehensive real-time counter load balancing system implemented in the KCAU Smart Queue Management System. The system intelligently distributes tickets across counters based on current load, queue length, service capacity, and customer priority.

## Key Features

### 1. **Real-Time Load Metrics**
- Continuous calculation of load scores for each counter (0-100 scale)
- Queue length tracking (waiting + currently serving)
- Estimated wait time calculation
- Load status classification (available, busy, overloaded)

### 2. **Intelligent Counter Assignment**
- Automatic selection of best counter when creating new tickets
- Priority-aware assignment (urgent/VIP customers get shorter queues)
- Service type matching validation
- Real-time availability status consideration

### 3. **Load Balancing Monitor**
- Runs every 10 seconds
- Broadcasts real-time metrics to all connected clients via Socket.io
- Calculates aggregate system load (low/moderate/high)
- Identifies overloaded and underutilized counters

### 4. **Rebalancing Suggestions**
- Recommends ticket redistribution when load imbalance detected
- Suggests moving tickets from overloaded to underutilized counters
- Validates service type compatibility before suggesting transfers

## API Endpoints

### Load Balancing Endpoints

#### 1. Get Load Balancing Dashboard
```http
GET /api/counters/load-balancing/dashboard
```
**Authentication:** Staff/Admin  
**Returns:** Real-time dashboard with counter metrics and system statistics

**Response:**
```json
{
  "message": "Load balancing dashboard",
  "data": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "summary": {
      "totalCounters": 12,
      "availableCounters": 10,
      "busyCounters": 8,
      "overloadedCounters": 2,
      "totalQueueLength": 45,
      "avgLoadScore": 65,
      "systemLoad": "moderate"
    },
    "counterMetrics": [
      {
        "counterId": "507f1f77bcf86cd799439011",
        "counterName": "Counter 1",
        "status": "open",
        "availabilityStatus": "available",
        "serviceTypes": ["Admissions", "Finance"],
        "waitingCount": 2,
        "servingCount": 1,
        "totalQueueLength": 3,
        "loadScore": 30,
        "isAvailable": true,
        "estimatedWaitTime": 6,
        "lastAvailabilityChange": "2024-01-20T10:00:00.000Z"
      },
      // ... more counters
    ],
    "mostLoaded": {
      "counterName": "Counter 5",
      "loadScore": 92,
      "totalQueueLength": 10
    },
    "leastLoaded": {
      "counterName": "Counter 1",
      "loadScore": 15,
      "totalQueueLength": 1
    },
    "recommendations": [
      {
        "action": "redistribute_tickets",
        "fromCounter": {
          "id": "507f1f77bcf86cd799439012",
          "name": "Counter 5",
          "loadScore": 92,
          "queueLength": 10
        },
        "toCounter": {
          "id": "507f1f77bcf86cd799439011",
          "name": "Counter 1",
          "loadScore": 15,
          "queueLength": 1
        },
        "commonServices": ["Admissions"],
        "reason": "Move tickets from overloaded Counter 5 (load: 92%) to Counter 1 (load: 15%)"
      }
    ]
  }
}
```

#### 2. Get Counters Sorted by Load
```http
GET /api/counters/load-balancing/by-load?serviceType=Admissions
```
**Authentication:** Staff/Admin  
**Query Parameters:**
- `serviceType` (optional): Filter by service type

**Returns:** Array of counters sorted by load score (lowest first)

```json
{
  "message": "Counters sorted by load",
  "serviceType": "Admissions",
  "count": 5,
  "counters": [
    {
      "counterId": "507f1f77bcf86cd799439011",
      "counterName": "Counter 1",
      "loadScore": 20,
      "estimatedWaitTime": 0,
      // ... other metrics
    },
    // ... more counters in ascending load order
  ]
}
```

#### 3. Get Best Counter Recommendation
```http
GET /api/counters/load-balancing/best-counter?serviceType=Finance&priority=high
```
**Authentication:** Staff/Admin  
**Query Parameters:**
- `serviceType` (required): Service type needed
- `priority` (optional): Ticket priority level (normal, high, urgent, vip)

**Returns:** Best counter recommendation for the ticket

```json
{
  "message": "Best counter recommended",
  "recommendation": {
    "counterId": "507f1f77bcf86cd799439011",
    "counterName": "Counter 1",
    "loadScore": 20,
    "waitingCount": 1,
    "servingCount": 1,
    "totalQueueLength": 2,
    "estimatedWaitTime": 3,
    "isAvailable": true
  },
  "reason": "Counter has 2 customer(s) in queue with estimated wait time of 3 minutes"
}
```

#### 4. Get Load Rebalancing Suggestions
```http
GET /api/counters/load-balancing/suggestions?threshold=70
```
**Authentication:** Admin only  
**Query Parameters:**
- `threshold` (optional): Load score threshold for overloaded counters (default: 70)

**Returns:** Suggestions for redistributing tickets

```json
{
  "message": "Load rebalancing suggestions",
  "loadThreshold": 70,
  "suggestionCount": 3,
  "suggestions": [
    {
      "action": "redistribute_tickets",
      "fromCounter": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Counter 5",
        "loadScore": 92,
        "queueLength": 10
      },
      "toCounter": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Counter 1",
        "loadScore": 15,
        "queueLength": 1
      },
      "commonServices": ["Admissions"],
      "reason": "Move tickets from overloaded Counter 5 (load: 92%) to Counter 1 (load: 15%)"
    }
  ]
}
```

## Real-Time Socket.io Events

### Broadcast Events

#### Load Metrics Updated
Broadcasted every 10 seconds to all connected clients:

```
Event: loadMetricsUpdated
Data: {
  "timestamp": "2024-01-20T10:30:00.000Z",
  "summary": {
    "totalCounters": 12,
    "availableCounters": 10,
    "busyCounters": 8,
    "overloadedCounters": 2,
    "totalQueueLength": 45,
    "avgLoadScore": 65,
    "systemLoad": "moderate"
  },
  "counterMetrics": [...],
  "recommendations": [...]
}
```

**Listen in Frontend:**
```javascript
socket.on('loadMetricsUpdated', (data) => {
  console.log('System load:', data.summary.systemLoad);
  console.log('Average load score:', data.summary.avgLoadScore);
  updateUIWithMetrics(data);
});
```

## Load Calculation Algorithm

### Load Score Formula
The load score (0-100) is calculated based on:

1. **Counter Status:**
   - Closed: 100 (unavailable)
   - Busy: 80 + (waiting * 5)
   - Open: waiting * 10

2. **Availability Status:**
   - Unavailable/Maintenance/On_Break: 100
   - Available: Normal calculation

3. **Queue Length:**
   - Waiting customers: Direct impact on score
   - Currently serving: Counts as 1 toward queue length

### Priority-Based Assignment
- **Urgent/VIP/High:** Assigns to counter with lowest load score (shortest queue)
- **Normal:** Assigns to reasonably loaded counter (< 50 load) or least busy if all busy

### Estimated Wait Time
```
Estimated Wait Time = (Queue Length - 1) × 3 minutes
```
Assumes 3 minutes average service time per customer.

## Load Status Classification

| Score | Status | Description |
|-------|--------|-------------|
| 0-30 | Light | Few or no customers waiting |
| 31-60 | Moderate | Normal busy state, acceptable wait |
| 61-80 | Heavy | Significant queue, longer wait times |
| 81-100 | Overloaded | Queue very long or counter unavailable |

## Integration Points

### 1. Ticket Creation
When a new ticket is created:
```javascript
const bestCounter = await findBestCounterForTicket(serviceType, priority);
ticket.counterId = bestCounter.counterId;
```

### 2. Real-Time Monitoring
Load balancing monitor starts automatically:
```javascript
startLoadBalancingMonitor(io, 10000); // Updates every 10 seconds
```

### 3. Staff Dashboard
Staff can view:
- Current load metrics for all counters
- Estimated wait times
- Rebalancing recommendations

### 4. Admin Tools
Admins can:
- View detailed load metrics
- Manually transfer tickets using rebalancing suggestions
- Set maintenance windows
- Monitor system health

## Configuration

### Load Monitoring Interval
Located in [backend/src/index.js](backend/src/index.js#L76):
```javascript
startLoadBalancingMonitor(io, 10000); // 10 seconds
```
Adjust the interval value (in milliseconds) to change update frequency.

### Load Threshold
Located in API endpoint, default threshold is 70:
```javascript
GET /api/counters/load-balancing/suggestions?threshold=70
```

### Average Service Time
Located in [backend/src/utils/loadBalancer.js](backend/src/utils/loadBalancer.js#L34):
```javascript
const avgServiceTimeMinutes = 3; // Adjust based on actual data
```

## Performance Considerations

1. **Database Queries:** Load calculations use aggregation to minimize queries
2. **Real-Time Updates:** Socket.io broadcasts reduce polling overhead
3. **Scalability:** Monitor interval can be adjusted based on system load
4. **Caching:** Consider caching metrics if queue is very large

## Error Handling

The load balancing system includes:
- Try-catch blocks for all async operations
- Fallback to null if no counters available
- Graceful handling of missing data
- Detailed error logging

## Example Use Cases

### Use Case 1: High Priority Customer
```javascript
// Customer with VIP status creates ticket
const response = await ticketService.createTicket({
  serviceType: 'Finance',
  userId: vipCustomerId,
  priority: 'vip'
});
// Load balancer assigns shortest available queue
```

### Use Case 2: Monitor System Health
```javascript
// Admin checks dashboard to see current load
const dashboard = await counterService.getLoadBalancingDashboard();
if (dashboard.summary.systemLoad === 'high') {
  // Alert staff to open more counters
}
```

### Use Case 3: Implement Rebalancing
```javascript
// Admin gets suggestions and manually transfers a ticket
const suggestions = await counterService.getLoadRebalancingSuggestions();
await ticketService.transferTicket(ticketId, {
  newCounterId: suggestions[0].toCounter.id,
  reason: 'Load rebalancing'
});
```

## Testing

### Manual Testing Checklist
- [ ] Create multiple tickets and verify they're distributed across counters
- [ ] Monitor load metrics via API and Socket.io
- [ ] Verify priority-based assignment (create VIP ticket, check load)
- [ ] Test rebalancing suggestions with high load threshold
- [ ] Verify load metrics update every 10 seconds via Socket.io
- [ ] Test with counters in maintenance mode

### Expected Behavior
- Tickets should be assigned to least loaded counter
- High-priority tickets should get shorter queues
- Load score should reflect actual queue state
- System load should change as tickets are created/completed
- Monitor interval should broadcast updates consistently

## Troubleshooting

### Load Metrics Not Updating
1. Check Socket.io connection: `socket.connected`
2. Verify monitor is running: Check console logs for "Load balancing metrics updated"
3. Check database connection for counting queries

### Best Counter Always Same
1. Verify threshold calculation: Check load scores via dashboard
2. Ensure counters have different `serviceTypes`
3. Check counter availability status

### High Load Score Despite Low Queue
1. Verify average service time assumption (3 minutes)
2. Check if counters are marked as maintenance/unavailable
3. Review counter status (closed/open/busy)

## Future Enhancements

1. **Machine Learning:** Predict wait times based on historical data
2. **Dynamic Service Time:** Adjust based on actual service times
3. **Counter Capacity:** Support variable service rates per counter
4. **Multi-Service Counters:** Better handling of counters with multiple services
5. **Peak Hour Analysis:** Different load algorithms for busy periods
6. **Customer Preferences:** Remember and predict customer counter preferences

## Files Modified

- [backend/src/utils/loadBalancer.js](backend/src/utils/loadBalancer.js) - NEW
- [backend/src/controllers/counterController.js](backend/src/controllers/counterController.js)
- [backend/src/controllers/ticketController.js](backend/src/controllers/ticketController.js)
- [backend/src/routes/counterRoutes.js](backend/src/routes/counterRoutes.js)
- [backend/src/utils/socketEvents.js](backend/src/utils/socketEvents.js)
- [backend/src/index.js](backend/src/index.js)

## Support

For issues or questions about the load balancing system, refer to:
- Load balancer utility: [backend/src/utils/loadBalancer.js](backend/src/utils/loadBalancer.js)
- Counter controller: [backend/src/controllers/counterController.js](backend/src/controllers/counterController.js)
- Socket events: [backend/src/utils/socketEvents.js](backend/src/utils/socketEvents.js)
