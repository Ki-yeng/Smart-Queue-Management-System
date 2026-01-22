# Real-Time Counter Load Balancing System

## Overview

The Smart Queue Management System now includes an advanced real-time load balancing system that automatically distributes tickets across counters based on:

- **Current queue length** at each counter
- **Service type** availability
- **Ticket priority** levels
- **Counter availability status** (available, maintenance, on break)
- **Staff assignments** and competency
- **Service time metrics** and performance history

## Architecture

### Components

1. **Load Balancer Utility** (`backend/src/utils/loadBalancer.js`)
   - Calculates counter load metrics
   - Finds optimal counter for tickets
   - Monitors system-wide load
   - Provides rebalancing suggestions

2. **Load Balancing Controller** (`backend/src/controllers/loadBalancingController.js`)
   - API endpoints for load monitoring
   - Manual rebalancing triggers
   - Optimization insights
   - Real-time status queries

3. **Load Balancing Routes** (`backend/src/routes/loadBalancingRoutes.js`)
   - REST API endpoints
   - Socket.IO integration points

4. **Real-Time Monitor**
   - Runs every 10 seconds in production
   - Broadcasts load metrics via Socket.IO
   - Triggers automatic rebalancing when needed

## How It Works

### Load Score Calculation

Each counter gets a load score (0-100) based on:

```
loadScore = base_penalty + queue_penalty + status_penalty

Where:
- base_penalty: 0 for healthy counters, 100 for unavailable
- queue_penalty: queue_length × 10 (max 80 for open counters)
- status_penalty: +20 if busy without queue

Lower score = less loaded = better candidate
```

### Ticket Assignment Flow

1. **Ticket Creation**
   ```
   Student creates ticket → System calculates priority
   → findBestCounterForTicket() → Assigns to counter with lowest load
   → Emits Socket.IO event
   ```

2. **Auto-Assignment (Optional)**
   ```
   If autoAssign=true in request:
   → Find next priority-sorted waiting ticket
   → Get best counter for ticket's service type
   → Update ticket status to "serving"
   → Broadcast via Socket.IO
   ```

3. **Queue Rebalancing (Periodic)**
   ```
   Every 10 seconds (configurable):
   → Calculate all counter loads
   → Identify overloaded counters
   → Find underutilized counters
   → Generate rebalancing suggestions
   → Emit metrics to clients
   ```

## API Endpoints

### 1. System Load Status (Public)
```
GET /api/load-balance/status

Response:
{
  "summary": {
    "totalCounters": 15,
    "availableCounters": 12,
    "busyCounters": 8,
    "overloadedCounters": 2,
    "totalQueueLength": 23,
    "avgLoadScore": 45,
    "systemLoad": "moderate"
  },
  "counterMetrics": [
    {
      "counterId": "...",
      "counterName": "Counter 1",
      "loadScore": 20,
      "totalQueueLength": 1,
      "estimatedWaitTime": 3,
      "isAvailable": true
    },
    ...
  ],
  "mostLoaded": {...},
  "leastLoaded": {...},
  "recommendations": [...]
}
```

### 2. Service Load Status (Staff)
```
GET /api/load-balance/service/:serviceType

Example: GET /api/load-balance/service/Finance

Response:
{
  "serviceType": "Finance",
  "summary": {
    "totalCounters": 4,
    "availableCounters": 3,
    "busyCounters": 2,
    "totalQueueLength": 8,
    "avgLoadScore": 52,
    "systemHealth": "moderate"
  },
  "counters": [
    {
      "id": "...",
      "name": "Finance Counter 1",
      "loadScore": 30,
      "queueLength": 2,
      "estimatedWaitTime": "6 minutes",
      "staffAssigned": "John Doe",
      "isAvailable": true
    },
    ...
  ]
}
```

### 3. Find Best Counter (Public)
```
GET /api/load-balance/best-counter?serviceType=Finance&priority=high

Response:
{
  "recommendation": {
    "counterId": "...",
    "counterName": "Finance Counter 2",
    "currentLoad": 25,
    "reason": "Counter has lowest load score (25%) with queue length of 1",
    "estimatedWaitTime": "3 minutes",
    "staffAssigned": "Jane Smith"
  }
}
```

### 4. Get Counters Sorted by Load (Public)
```
GET /api/load-balance/counters-by-load?serviceType=Admissions

Response:
{
  "filter": "Admissions",
  "totalCounters": 3,
  "counters": [
    {
      "id": "...",
      "name": "Admissions Counter 3",
      "loadScore": 15,
      "queueLength": 0,
      "waitingTickets": 0,
      "servingTickets": 0,
      "estimatedWaitTime": "0 minutes",
      "staffAssigned": "Mike Johnson",
      "isAvailable": true
    },
    ...
  ]
}
```

### 5. Load Recommendations (Staff)
```
GET /api/load-balance/recommendations

Response:
{
  "totalSuggestions": 2,
  "suggestions": [
    {
      "action": "redistribute_tickets",
      "fromCounter": {
        "name": "Finance Counter 1",
        "currentLoad": 85,
        "queueLength": 6
      },
      "toCounter": {
        "name": "Finance Counter 3",
        "currentLoad": 35,
        "queueLength": 2
      },
      "services": ["Finance"],
      "reason": "Move tickets from overloaded Finance Counter 1..."
    },
    ...
  ]
}
```

### 6. Auto-Assign Ticket (Admin)
```
POST /api/load-balance/auto-assign

Body:
{
  "serviceType": "Finance"
}

Response:
{
  "message": "Ticket auto-assigned to optimal counter",
  "ticket": {
    "id": "...",
    "ticketNumber": 42,
    "status": "serving"
  },
  "assignedCounter": {
    "counterName": "Finance Counter 2",
    "loadScore": 30
  }
}
```

### 7. Rebalance Service Queue (Admin)
```
POST /api/load-balance/rebalance/:serviceType

Example: POST /api/load-balance/rebalance/Finance

Response:
{
  "message": "Queue rebalancing completed for Finance",
  "result": {
    "serviceType": "Finance",
    "ticketsProcessed": 12,
    "ticketsAssigned": 10,
    "ticketsSkipped": 2,
    "successRate": 83
  }
}
```

### 8. Optimization Insights (Admin)
```
GET /api/load-balance/insights

Response:
{
  "overallHealth": "moderate",
  "criticalMetrics": {
    "avgLoadScore": 48,
    "totalQueueLength": 45,
    "overloadedCounters": 3,
    "utilizationRate": 62
  },
  "serviceAnalysis": {
    "Finance": {
      "availableCounters": 4,
      "avgLoad": 55,
      "overloadedCounters": 1,
      "totalQueue": 12
    },
    ...
  },
  "bottlenecks": [
    {
      "service": "Finance",
      "reason": "High load and queue length",
      "severity": "warning",
      "recommendation": "Consider adding more staff or counters"
    }
  ],
  "optimizations": [
    {
      "action": "redistribute_staff",
      "priority": "high",
      "details": "3 counter(s) are overloaded. Consider reassigning staff."
    }
  ]
}
```

## Real-Time Socket.IO Events

### Events Emitted

1. **loadMetricsUpdated** (Every 10 seconds)
   ```javascript
   io.emit("loadMetricsUpdated", {
     timestamp: "2026-01-20T10:30:00Z",
     summary: {...},
     counterMetrics: [...],
     recommendations: [...]
   });
   ```

2. **service-load-updated** (Per service)
   ```javascript
   io.to("service-Finance").emit("service-load-updated", {
     serviceType: "Finance",
     counterMetrics: [...],
     avgLoad: 52
   });
   ```

3. **counter-assigned-ticket** (Per service)
   ```javascript
   io.to("service-Finance").emit("counter-assigned-ticket", {
     ticket: {...},
     counter: {...},
     currentMetrics: {...}
   });
   ```

4. **queue-rebalanced** (Per service)
   ```javascript
   io.to("service-Finance").emit("queue-rebalanced", {
     serviceType: "Finance",
     result: {...},
     updatedMetrics: {...}
   });
   ```

### Client-Side Socket.IO Listening

```javascript
// Connect to Socket.IO
const socket = io("http://localhost:5000", {
  auth: { token: "your-jwt-token" }
});

// Listen for system load updates
socket.on("loadMetricsUpdated", (data) => {
  console.log("System load updated:", data.summary);
  updateDashboard(data);
});

// Listen for service-specific updates
socket.emit("joinServiceQueue", { serviceType: "Finance" });
socket.on("service-load-updated", (data) => {
  console.log(`${data.serviceType} load: ${data.avgLoad}%`);
  updateServiceDashboard(data);
});

// Listen for counter assignments
socket.on("counter-assigned-ticket", (data) => {
  console.log(`Ticket assigned to ${data.counter.counterName}`);
});

// Listen for queue rebalancing
socket.on("queue-rebalanced", (data) => {
  console.log(`${data.serviceType} queue rebalanced`);
});
```

## Load Balancing Scenarios

### Scenario 1: Uneven Load Distribution
```
Finance Counter 1: 8 waiting tickets (load: 80%)
Finance Counter 2: 1 waiting ticket (load: 20%)
Finance Counter 3: 2 waiting tickets (load: 30%)

Action: System recommends moving tickets from Counter 1 to Counters 2 & 3
Admin triggers: POST /api/load-balance/rebalance/Finance
Result: Tickets distributed more evenly across counters
```

### Scenario 2: Counter Goes to Maintenance
```
Before:
- Finance: 4 available counters (avg load: 40%)

Maintenance triggered on Counter 1:
- Finance: 3 available counters (avg load: 53%)

System:
1. Marks Counter 1 as unavailable
2. Emits counter status update
3. Automatically increases load for remaining counters
4. Recommends counter reassignments or temporary staffing
```

### Scenario 3: High Priority Ticket Arrives
```
High-priority Final Year student creates ticket

System:
1. Ticket assigned priority: "high" (priority score: 150+)
2. findBestCounterForTicket("Finance", "high") called
3. Prefers counter with shortest queue
4. Assigns to Finance Counter 2 (queue: 1 ticket)
5. Emits Socket.IO events for real-time update
```

### Scenario 4: Peak Hours
```
8:00 AM - High demand for Admissions service
- All 3 Admissions counters at 90%+ load
- 15+ waiting tickets

System:
1. Creates alerts for staff
2. Recommends temporary staff reassignment
3. Suggests opening additional service counters if available
4. Provides estimated wait times to new arrivals
```

## Configuration

### Load Balancing Monitor Interval

In `backend/src/index.js`:
```javascript
// Default: 10 seconds
startLoadBalancingMonitor(io, 10000);

// Change to 5 seconds for faster updates
startLoadBalancingMonitor(io, 5000);

// Change to 30 seconds for lower CPU usage
startLoadBalancingMonitor(io, 30000);
```

### Load Score Thresholds

In `backend/src/utils/loadBalancer.js`:
```javascript
// Adjust load thresholds for rebalancing suggestions
const suggestions = await suggestLoadRebalancing(75); // Default: 70

// Adjust wait time calculation
const calculateEstimatedWaitTime = (queueLength) => {
  const avgServiceTimeMinutes = 5; // Adjust based on your service type
  return Math.max(0, (queueLength - 1) * avgServiceTimeMinutes);
};
```

## Performance Metrics

### Dashboard Indicators

**System Load Status:**
- `healthy`: Average load < 40%
- `moderate`: Average load 40-70%
- `overloaded`: Average load > 70%

**Counter Status:**
- `available`: Can accept new tickets (load < 80%)
- `busy`: Serving tickets (load 60-80%)
- `overloaded`: High queue (load > 80%)
- `unavailable`: Maintenance/break (load = 100%)

### Monitoring Best Practices

1. **Set Alert Thresholds**
   ```
   - Warning: System load > 60%
   - Critical: System load > 80%
   - Action: Staff shortage alerts at 5+ waiting per counter
   ```

2. **Regular Review**
   - Check daily optimization insights
   - Identify underutilized counters
   - Monitor service type bottlenecks
   - Track staff efficiency metrics

3. **Proactive Adjustments**
   - Add counters before peak hours
   - Redistribute staff based on service demand
   - Schedule maintenance during low-traffic periods
   - Monitor wait time trends

## Example Implementation

### Auto-Assignment Flow (Recommended)

```javascript
// When ticket is created
POST /api/tickets/create
{
  "serviceType": "Finance",
  "studentName": "John Doe",
  "email": "john@example.com",
  "userId": "user123"
}

Response:
{
  "message": "Ticket created",
  "ticket": {
    "_id": "ticket123",
    "ticketNumber": 42,
    "status": "waiting",
    "serviceType": "Finance",
    "priority": "high",
    "counterId": "counter456" // Auto-assigned via load balancing
  }
}
```

### Dashboard Real-Time Updates

```javascript
// Frontend listens for load updates
useEffect(() => {
  socket.on("loadMetricsUpdated", (data) => {
    setSystemLoad(data.summary);
    setCounterMetrics(data.counterMetrics);
    updateVisualization(data);
  });

  socket.on("service-load-updated", (data) => {
    updateServiceChart(data.serviceType, data.avgLoad);
  });
}, [socket]);
```

## Troubleshooting

### Issue: Tickets Stuck in Queue

**Check:**
1. Counter availability: `GET /api/load-balance/service/Finance`
2. Counter status: All should be "available"
3. Staff assignments: `GET /api/counters/assignments/all`

**Fix:**
1. Resume maintenance counters: `PUT /api/counters/{id}/resume`
2. Assign staff: `PUT /api/counters/{id}/assign-staff`
3. Trigger rebalance: `POST /api/load-balance/rebalance/Finance`

### Issue: Uneven Load Despite Load Balancing

**Check:**
1. Service type distribution: Different counters handle different services
2. Counter capabilities: Check `serviceTypes` array
3. Priority distribution: High-priority tickets may cluster

**Fix:**
1. Assign multiple service types to counters
2. Review service type demand patterns
3. Adjust priority score weights if needed

### Issue: Load Monitor Not Broadcasting

**Check:**
1. Socket.IO connection: Check browser console
2. Load balancer monitor started: Check server logs
3. Monitor interval: May be too long (> 30s)

**Fix:**
1. Restart server
2. Check Socket.IO CORS settings
3. Reduce monitor interval for testing

## Future Enhancements

- ML-based predictive load forecasting
- Automatic staff scheduling based on load patterns
- Cross-service ticket reassignment
- Service time SLA monitoring and alerts
- Counter-level performance optimization
- Integration with external calendar for event-based load predictions
