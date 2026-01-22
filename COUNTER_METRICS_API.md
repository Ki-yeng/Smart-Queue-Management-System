# Counter Metrics Implementation - API Reference

## Overview

Counter metrics track and analyze the performance of each service counter, including:
- Total tickets served
- Average service time
- Service time by service type
- Daily metrics
- Performance trends

## Data Model

### Performance Metrics Structure

```javascript
performanceMetrics: {
  totalTicketsServed: Number,        // Total tickets completed at counter
  avgServiceTime: Number,             // Average time to serve one ticket (seconds)
  totalServiceTime: Number,           // Total accumulated service time (seconds)
  minServiceTime: Number,             // Fastest service (seconds)
  maxServiceTime: Number,             // Slowest service (seconds)
  ticketsCompletedToday: Number,      // Tickets served in current day
  uptimePercentage: Number,           // Counter availability %
  lastUpdated: Date                   // Last metrics update
}
```

### Service-Type Specific Metrics

```javascript
serviceMetricsPerType: [
  {
    serviceType: String,              // e.g., "Finance"
    ticketsServed: Number,            // Tickets for this service
    avgServiceTime: Number,           // Average time (seconds)
    totalServiceTime: Number          // Total time (seconds)
  }
]
```

### Daily Metrics History

```javascript
dailyMetrics: [
  {
    date: Date,
    ticketsServed: Number,
    avgServiceTime: Number,
    peakHour: String,
    customerSatisfaction: Number
  }
]
```

---

## API Endpoints

### 1. Get Counter Metrics by ID
```http
GET /api/counters/metrics/:id
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Parameters:**
- `:id` - Counter ID (ObjectId)

**Response (200 OK):**
```json
{
  "message": "Counter metrics retrieved",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "metrics": {
    "counterId": "507f1f77bcf86cd799439011",
    "counterName": "Counter 1",
    "serviceType": "Finance",
    "assignedStaff": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@kcau.ac.ke"
    },
    "performance": {
      "totalTicketsServed": 245,
      "avgServiceTime": 180,
      "avgServiceTimeMinutes": "3.00",
      "minServiceTime": 45,
      "maxServiceTime": 720,
      "ticketsCompletedToday": 12,
      "totalServiceTime": 44100,
      "lastUpdated": "2024-01-20T10:25:00.000Z"
    },
    "serviceTypeMetrics": [
      {
        "serviceType": "Finance",
        "ticketsServed": 245,
        "avgServiceTime": 180,
        "avgServiceTimeMinutes": "3.00",
        "totalServiceTime": 44100
      }
    ],
    "availability": {
      "status": "available",
      "uptimePercentage": 99.5,
      "lastMaintenanceDate": "2024-01-15T08:00:00.000Z"
    }
  }
}
```

---

### 2. Get All Counters Metrics
```http
GET /api/counters/metrics/all
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Description:** Get metrics for all counters

**Response (200 OK):**
```json
{
  "message": "All counters metrics retrieved",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "totalCounters": 12,
  "metrics": [
    {
      "counterId": "507f1f77bcf86cd799439011",
      "counterName": "Counter 1",
      "serviceType": "Finance",
      "assignedStaff": { "name": "John Doe", "email": "john@kcau.ac.ke" },
      "ticketsServed": 245,
      "avgServiceTime": 180,
      "avgServiceTimeMinutes": "3.00",
      "ticketsCompletedToday": 12,
      "uptimePercentage": 99.5
    },
    {
      "counterId": "507f1f77bcf86cd799439013",
      "counterName": "Counter 2",
      "serviceType": "Admissions",
      "assignedStaff": { "name": "Jane Smith", "email": "jane@kcau.ac.ke" },
      "ticketsServed": 198,
      "avgServiceTime": 240,
      "avgServiceTimeMinutes": "4.00",
      "ticketsCompletedToday": 8,
      "uptimePercentage": 98.0
    }
    // ... more counters
  ]
}
```

---

### 3. Get Counter Performance Comparison
```http
GET /api/counters/metrics/comparison
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Description:** Compare performance across all counters

**Response (200 OK):**
```json
{
  "message": "Counter performance comparison",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "summary": {
    "totalCounters": 12,
    "totalTicketsServed": 2650,
    "avgTicketsPerCounter": 220,
    "avgServiceTime": 205,
    "avgServiceTimeMinutes": "3.42"
  },
  "comparison": [
    {
      "counterName": "Counter 1",
      "ticketsServed": 245,
      "avgServiceTime": 180,
      "ticketsCompletedToday": 12,
      "status": "open"
    },
    {
      "counterName": "Counter 2",
      "ticketsServed": 198,
      "avgServiceTime": 240,
      "ticketsCompletedToday": 8,
      "status": "open"
    }
    // ... more counters
  ],
  "topPerformers": {
    "mostProductive": {
      "counterName": "Counter 1",
      "ticketsServed": 245
    },
    "mostEfficient": {
      "counterName": "Counter 3",
      "avgServiceTime": 150,
      "avgServiceTimeMinutes": "2.50"
    }
  }
}
```

---

### 4. Get Metrics Dashboard Summary
```http
GET /api/counters/metrics/summary
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Description:** Get summary metrics for dashboard display

**Response (200 OK):**
```json
{
  "message": "Metrics dashboard summary",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "totalCounters": 12,
  "metrics": {
    "totalTicketsServed": 2650,
    "avgTicketsPerCounter": 220,
    "avgServiceTime": 205,
    "avgServiceTimeMinutes": "3.42",
    "ticketsServedToday": 98
  },
  "topCounters": [
    {
      "counterName": "Counter 1",
      "ticketsServed": 245,
      "avgServiceTime": 180
    },
    {
      "counterName": "Counter 2",
      "ticketsServed": 198,
      "avgServiceTime": 240
    },
    {
      "counterName": "Counter 5",
      "ticketsServed": 187,
      "avgServiceTime": 195
    }
  ]
}
```

---

## Metrics Calculations

### Average Service Time
```
avgServiceTime = totalServiceTime / totalTicketsServed (in seconds)
avgServiceTimeMinutes = avgServiceTime / 60
```

### Service Time
Calculated when a ticket is completed:
```
serviceTime = completedAt - servedAt (in seconds)
```

### Daily Metrics
Tracked separately for each calendar day and archived for trend analysis.

---

## Usage Examples

### JavaScript/Fetch

```javascript
// Get counter metrics
async function getCounterMetrics(counterId) {
  const response = await fetch(
    `http://localhost:5000/api/counters/metrics/${counterId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  console.log(`Counter: ${data.metrics.counterName}`);
  console.log(`Tickets Served: ${data.metrics.performance.totalTicketsServed}`);
  console.log(`Avg Service Time: ${data.metrics.performance.avgServiceTimeMinutes} minutes`);
}

// Get performance comparison
async function getComparison() {
  const response = await fetch(
    'http://localhost:5000/api/counters/metrics/comparison',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  console.log('Top Performer:', data.topPerformers.mostProductive);
  console.log('Most Efficient:', data.topPerformers.mostEfficient);
}

// Get summary for dashboard
async function getDashboardSummary() {
  const response = await fetch(
    'http://localhost:5000/api/counters/metrics/summary',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  console.log(`Total Tickets Today: ${data.metrics.ticketsServedToday}`);
  console.log(`Top Counters:`, data.topCounters);
}
```

### React Component

```jsx
import { useEffect, useState } from 'react';

export default function CounterMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/counters/metrics/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading metrics...</div>;
  if (!metrics) return <div>No data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded">
          <p className="text-gray-600 text-sm">Total Tickets (Today)</p>
          <p className="text-2xl font-bold">{metrics.metrics.ticketsServedToday}</p>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <p className="text-gray-600 text-sm">Average Service Time</p>
          <p className="text-2xl font-bold">{metrics.metrics.avgServiceTimeMinutes} min</p>
        </div>
        <div className="p-4 bg-purple-50 rounded">
          <p className="text-gray-600 text-sm">Avg per Counter</p>
          <p className="text-2xl font-bold">{metrics.metrics.avgTicketsPerCounter}</p>
        </div>
      </div>

      <div className="bg-white rounded shadow">
        <h3 className="p-4 font-bold border-b">Top Performing Counters</h3>
        <div className="divide-y">
          {metrics.topCounters.map((counter, idx) => (
            <div key={idx} className="p-4 flex justify-between">
              <span>{counter.counterName}</span>
              <span>{counter.ticketsServed} tickets</span>
              <span className="text-gray-600">{Math.round(counter.avgServiceTime / 60)} min avg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Metrics Update Process

### When a Ticket is Completed

1. **Calculate Service Time**
   - `serviceTime = completedAt - servedAt`

2. **Update Counter Metrics**
   - Increment `totalTicketsServed`
   - Add service time to `totalServiceTime`
   - Recalculate `avgServiceTime`
   - Update `minServiceTime` and `maxServiceTime` if needed

3. **Update Service Type Metrics**
   - Track tickets by service type
   - Calculate average per service type

4. **Update Daily Metrics**
   - Increment `ticketsCompletedToday`
   - Reset at end of day

5. **Emit Update**
   - Log the update
   - Optionally emit Socket.io event

---

## Performance Metrics Interpretation

### Average Service Time
- **< 2 minutes (120s):** Excellent - Very efficient
- **2-3 minutes (120-180s):** Good - Normal range
- **3-4 minutes (180-240s):** Fair - Acceptable
- **> 4 minutes (240s+):** Slow - May need review

### Tickets Served
- Compare against other counters
- Track daily trends
- Identify peak hours

### Min/Max Service Time
- **Min:** Fastest possible interaction
- **Max:** Longest interaction, may indicate complex case

---

## Utility Functions

Located in `backend/src/utils/metricsCalculator.js`:

```javascript
// Calculate service time for a ticket
calculateServiceTime(servedAt, completedAt)

// Update metrics when ticket completes
updateCounterMetricsOnCompletion(counterId, ticket)

// Get metrics for specific counter
getCounterMetrics(counterId)

// Get metrics for all counters
getAllCounterMetrics()

// Compare performance across counters
getCounterComparison()

// Get summary for dashboard
getMetricsSummary()

// Reset daily metrics (call daily)
resetDailyMetrics()

// Archive daily metrics to history
archiveDailyMetrics()
```

---

## Data Flow

```
Ticket Completed
       ↓
completeTicket() controller
       ↓
updateCounterMetricsOnCompletion()
       ↓
1. Calculate serviceTime
2. Update performanceMetrics
3. Update serviceMetricsPerType
4. Update dailyMetrics
5. Save counter
       ↓
Metrics updated & available via API
```

---

## Related Endpoints

- `GET /api/counters/status/all` - Current counter status
- `GET /api/counters/load-balancing/dashboard` - Load metrics
- `GET /api/counters/assignments/all` - Staff assignments
- `GET /api/tickets` - All tickets

---

## Best Practices

1. **Regular Monitoring** - Check metrics daily
2. **Trend Analysis** - Look for patterns
3. **Performance Reviews** - Use data for staff evaluations
4. **Optimization** - Identify slow service counters
5. **Benchmarking** - Compare counter performance
6. **Reporting** - Generate performance reports

---

**Created:** January 20, 2026  
**Version:** 1.0  
**Status:** Ready for use ✅
