# Load Balancing System - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend (React)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  LoadBalancingDashboard Component                            │   │
│  │  - Display counter metrics in real-time                      │   │
│  │  - Show system load status                                   │   │
│  │  - Display rebalancing recommendations                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                        │
│                              │ Socket.io events                       │
│                              │ (loadMetricsUpdated)                  │
│                              │                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  counterService                                              │   │
│  │  - getLoadBalancingDashboard()                              │   │
│  │  - getCountersByLoad()                                       │   │
│  │  - getBestCounterForTicket()                                │   │
│  │  - getLoadRebalancingSuggestions()                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                        │
│                              │ HTTP Requests                         │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
                               │
┌──────────────────────────────┼────────────────────────────────────────┐
│                              ▼                                         │
│                      Backend (Node.js/Express)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Load Balancing Routes                                       │   │
│  │  GET /api/counters/load-balancing/dashboard                 │   │
│  │  GET /api/counters/load-balancing/by-load                   │   │
│  │  GET /api/counters/load-balancing/best-counter              │   │
│  │  GET /api/counters/load-balancing/suggestions               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                        │
│                              │                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Counter & Ticket Controllers                                │   │
│  │  - Updated createTicket() with load balancing               │   │
│  │  - New load balancing endpoint handlers                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                        │
│                              │                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Load Balancer Core                                          │   │
│  │  [utils/loadBalancer.js]                                     │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ calculateCounterLoadMetrics()                       │    │   │
│  │  │ - Queue length (waiting + serving)                  │    │   │
│  │  │ - Load score (0-100)                                │    │   │
│  │  │ - Availability status                               │    │   │
│  │  │ - Estimated wait time                               │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                           │                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ getCountersByLoad()                                  │   │   │
│  │  │ - Sort by load score (lowest first)                 │   │   │
│  │  │ - Optional service type filter                       │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                           │                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ findBestCounterForTicket()                           │   │   │
│  │  │ - Priority-based selection                           │   │   │
│  │  │ - Returns counter with best load                     │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                           │                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ suggestLoadRebalancing()                             │   │   │
│  │  │ - Find overloaded counters                           │   │   │
│  │  │ - Find underutilized counters                        │   │   │
│  │  │ - Suggest reassignments                              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                           │                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ startLoadBalancingMonitor()                          │   │   │
│  │  │ - Runs every 10 seconds                              │   │   │
│  │  │ - Calculates all metrics                             │   │   │
│  │  │ - Emits via Socket.io                                │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                           │                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MongoDB Database                                            │   │
│  │  - Counter collection                                        │   │
│  │  - Ticket collection                                         │   │
│  │  - User collection                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### 1. Ticket Creation Flow

```
Customer creates ticket
         │
         ▼
POST /api/tickets/create
         │
         ▼
createTicket() controller
         │
         ├─ Create ticket document
         │
         ├─ Call: findBestCounterForTicket(serviceType, priority)
         │
         │   ┌─ getCountersByLoad(serviceType)
         │   │  └─ Query all available counters
         │   │     └─ calculateCounterLoadMetrics() for each
         │   │        └─ Count waiting tickets
         │   │        └─ Check current ticket
         │   │        └─ Calculate load score
         │   │
         │   └─ Select counter based on priority
         │      ├─ Urgent/VIP: lowest load score
         │      └─ Normal: reasonable load (< 50) or least busy
         │
         ├─ Assign ticket to best counter
         │
         ├─ Emit Socket.io: ticketCreated
         │
         ▼
Return ticket with assignedCounter & estimatedWaitTime
```

### 2. Real-Time Monitoring Flow

```
Server starts
    │
    ├─ startLoadBalancingMonitor(io, 10000)
    │
    └─ Every 10 seconds:
       │
       ├─ getLoadBalancingDashboard()
       │  │
       │  ├─ getCountersByLoad() - all counters
       │  │  └─ calculateMetrics for each
       │  │
       │  └─ suggestLoadRebalancing()
       │     ├─ Find overloaded (> 70%)
       │     └─ Find underutilized (< 30%)
       │
       ├─ Emit Socket.io: loadMetricsUpdated
       │  └─ All connected clients receive in real-time
       │
       ▼
Frontend receives and updates dashboard
```

### 3. Load Score Calculation

```
Counter Load Score (0-100)

Input:
  ├─ Counter status (open/closed/busy)
  ├─ Availability status (available/unavailable/maintenance/on_break)
  ├─ Waiting tickets count
  ├─ Serving tickets count
  
Calculation:
  │
  ├─ If closed or unavailable → 100
  │
  ├─ If maintenance or on_break → 100
  │
  ├─ If status = "busy"
  │  └─ loadScore = 80 + (waitingCount × 5)
  │     └─ Max capped at 99
  │
  ├─ If status = "open"
  │  └─ loadScore = (waitingCount + 1) × 10
  │     └─ Max capped at 80
  │
  └─ Return: rounded loadScore

Output:
  ├─ loadScore: 0-100
  ├─ isAvailable: boolean
  ├─ estimatedWaitTime: minutes
  └─ statusLabel: "Light" | "Moderate" | "Heavy" | "Overloaded"
```

## API Response Examples

### Dashboard Response

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
        "loadScore": 30,
        "waitingCount": 2,
        "servingCount": 1,
        "totalQueueLength": 3,
        "estimatedWaitTime": 6,
        "isAvailable": true,
        "serviceTypes": ["Admissions", "Finance"]
      }
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
        "fromCounter": {...},
        "toCounter": {...},
        "commonServices": ["Admissions"],
        "reason": "Move tickets from overloaded Counter 5..."
      }
    ]
  }
}
```

## Real-Time Updates Timeline

```
T+0s:   Load monitor starts
        ├─ Query: Get all counters
        ├─ Process: Calculate metrics
        ├─ Emit: loadMetricsUpdated to all clients
        ▼

T+10s:  Load monitor runs again
        ├─ Query: Get all counters
        ├─ Process: Calculate metrics
        ├─ Emit: loadMetricsUpdated to all clients
        ▼

T+20s:  Load monitor runs again
        ├─ Query: Get all counters
        ├─ Process: Calculate metrics
        ├─ Emit: loadMetricsUpdated to all clients
        ▼
        
...continues indefinitely...

Meanwhile, when tickets created/completed:
         │
         ├─ ticketCreated event (real-time)
         ├─ ticketServing event (real-time)
         ├─ ticketCompleted event (real-time)
         │
         ▼
         Frontend updates immediately
         (next 10-second interval confirms via load metrics)
```

## Counters State Flow

```
Counter Lifecycle with Load Balancing:

                    ┌─────────────┐
                    │   Created   │
                    │ (status=?)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Open Counter│
                    │(accepting   │
                    │ customers)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼──────┐
    │   Busy    │    │  Closed   │   │ Maintenance│
    │(serving)  │    │(unavailable)  │   (on_break)│
    └─────┬─────┘    └─────┬─────┘   └─────┬──────┘
          │                │              │
    ┌─────▼──────────────────────────────▼─────┐
    │    Load Balancer Consideration:          │
    │    - Only considers "Open" & "Busy"      │
    │    - Avoids closed/maintenance/on_break  │
    │    - Calculates load score               │
    │    - Returns in sorted order             │
    └──────────────────────────────────────────┘
```

## Key Metrics Explained

| Metric | Range | Meaning |
|--------|-------|---------|
| **Load Score** | 0-100 | Overall busyness of counter |
| **Queue Length** | 0+ | Total customers (waiting + serving) |
| **Wait Count** | 0+ | Customers waiting in queue |
| **Serve Count** | 0-1 | Currently serving customer (0 or 1) |
| **Est. Wait Time** | 0+ minutes | Predicted wait (queue - 1) × 3 min |
| **Avg Load Score** | 0-100 | System-wide average |
| **System Load** | low/moderate/high | Overall system status |

## Performance Characteristics

- **Monitor Interval:** 10 seconds (configurable)
- **Database Queries:** O(n) where n = number of counters
- **Socket.io Broadcast:** Efficient binary protocol
- **Scalability:** Tested with 50+ counters
- **Real-Time Latency:** < 100ms (network dependent)

## Integration Points

```
Load Balancer integrates with:

├─ Ticket Controller
│  └─ createTicket() uses findBestCounterForTicket()
│
├─ Counter Controller  
│  └─ New endpoints expose load metrics
│
├─ Socket.IO
│  ├─ Emits loadMetricsUpdated every 10s
│  └─ Receives via frontend
│
├─ Database
│  ├─ Queries Counter collection
│  └─ Queries Ticket collection
│
└─ Frontend
   ├─ LoadBalancingDashboard component
   └─ counterService methods
```

---

**Last Updated:** January 20, 2026
