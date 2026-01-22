# Dashboard Statistics Aggregation - Complete Implementation

## Overview

The dashboard controller now provides comprehensive statistics aggregation across all system domains: tickets, counters, staff, service types, and performance metrics. This document details all endpoints, data structures, and usage examples.

## Endpoints Summary

### 1. **GET /api/dashboard** (Main Dashboard)
Comprehensive dashboard with all system statistics

**Authentication**: Required (Staff/Admin/Manager)

**Response Structure**:
```json
{
  "message": "Dashboard statistics retrieved",
  "data": {
    "timestamp": "2024-12-17T10:30:00.000Z",
    "summary": {
      "totalTicketsToday": 150,
      "totalQueueLength": 45,
      "completionRate": "85%",
      "avgWaitingTime": 8,
      "avgServiceTime": 5
    },
    "tickets": {
      "total": 150,
      "waiting": 35,
      "serving": 10,
      "completed": 105,
      "cancelled": 0,
      "completionRate": 85
    },
    "counters": {
      "total": 5,
      "active": 4,
      "busy": 2,
      "closed": 1,
      "available": 2,
      "maintenance": 1,
      "onBreak": 0
    },
    "staff": {
      "total": 8,
      "active": 6,
      "byDepartment": [
        {
          "_id": "admissions",
          "count": 3
        },
        {
          "_id": "finance",
          "count": 2
        }
      ]
    },
    "serviceTypes": [
      {
        "_id": "registration",
        "total": 45,
        "completed": 40,
        "waiting": 3,
        "serving": 2,
        "cancelled": 0
      },
      {
        "_id": "fee_payment",
        "total": 35,
        "completed": 30,
        "waiting": 4,
        "serving": 1,
        "cancelled": 0
      }
    ],
    "metrics": {
      "totalTicketsServed": 450,
      "avgServiceTime": 6
    },
    "hourlyDistribution": [
      {
        "_id": 8,
        "count": 12
      },
      {
        "_id": 9,
        "count": 28
      },
      {
        "_id": 10,
        "count": 35
      }
    ],
    "peakHour": "10:00 - 11:00 (35 tickets)",
    "priorityDistribution": [
      {
        "_id": "normal",
        "count": 120
      },
      {
        "_id": "high",
        "count": 25
      },
      {
        "_id": "urgent",
        "count": 5
      }
    ],
    "systemHealth": {
      "uptime": "99.9%",
      "responseTime": "< 100ms",
      "databaseStatus": "Connected",
      "socketIOStatus": "Active"
    }
  }
}
```

**What It Includes**:
- **Summary**: Key metrics at a glance (tickets today, queue length, completion rate, times)
- **Tickets**: Breakdown by status (waiting, serving, completed, cancelled)
- **Counters**: Status distribution (active, busy, closed, available, maintenance, on break)
- **Staff**: Total count, active count, distribution by department
- **Service Types**: Tickets per service type with status breakdown
- **Metrics**: Aggregated performance data across all counters
- **Hourly Distribution**: Tickets created per hour to identify peak times
- **Peak Hour**: The busiest hour of the day
- **Priority Distribution**: Tickets by priority level
- **System Health**: System status indicators

**Use Case**: Main dashboard page, real-time system overview

---

### 2. **GET /api/dashboard/quick-stats** (Lightweight Updates)
Minimal dataset for frequent polling and quick updates

**Authentication**: Required

**Response Structure**:
```json
{
  "message": "Quick stats retrieved",
  "timestamp": "2024-12-17T10:30:00.000Z",
  "stats": {
    "totalTicketsToday": 150,
    "waitingTickets": 35,
    "servingTickets": 10,
    "completedTickets": 105,
    "activeCounters": 4,
    "completionRate": "85%"
  }
}
```

**Data Included**:
- Total tickets today
- Queue breakdown (waiting, serving, completed)
- Active counters
- Completion rate

**Use Case**: Real-time status updates, status bar, header widgets, frequent polling (every 5-10 seconds)

---

### 3. **GET /api/dashboard/daily-report** (Daily Summary)
Detailed report for a specific day

**Authentication**: Required (Staff/Admin/Manager)

**Query Parameters**:
- `date` (optional): YYYY-MM-DD format. Default is today.

**Example**: `GET /api/dashboard/daily-report?date=2024-12-17`

**Response Structure**:
```json
{
  "message": "Daily report retrieved",
  "date": "2024-12-17",
  "summary": {
    "totalTickets": 150,
    "completedTickets": 105,
    "cancelledTickets": 0,
    "avgWaitTime": 8
  },
  "byService": [
    {
      "_id": "registration",
      "count": 45,
      "completed": 40
    },
    {
      "_id": "fee_payment",
      "count": 35,
      "completed": 30
    }
  ],
  "byPriority": [
    {
      "_id": "normal",
      "count": 120
    },
    {
      "_id": "high",
      "count": 25
    },
    {
      "_id": "urgent",
      "count": 5
    }
  ]
}
```

**Data Included**:
- Daily summary (total, completed, cancelled, average wait time)
- Breakdown by service type
- Breakdown by priority level

**Use Case**: Daily reports, historical analysis, end-of-day summaries

---

### 4. **GET /api/dashboard/performance** (Performance Metrics)
Staff and counter performance analysis

**Authentication**: Required (Staff/Admin/Manager)

**Response Structure**:
```json
{
  "message": "Performance report retrieved",
  "timestamp": "2024-12-17T10:30:00.000Z",
  "counters": [
    {
      "counterName": "Counter 1",
      "staff": {
        "name": "John Doe",
        "email": "john@example.com",
        "department": "admissions"
      },
      "ticketsServed": 45,
      "avgServiceTime": "5 min",
      "status": "active",
      "availability": "available"
    },
    {
      "counterName": "Counter 2",
      "staff": null,
      "ticketsServed": 38,
      "avgServiceTime": "6 min",
      "status": "active",
      "availability": "on_break"
    }
  ],
  "topStaff": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "department": "admissions",
      "ticketsServed": 120,
      "avgServiceTime": "5 min"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "department": "finance",
      "ticketsServed": 95,
      "avgServiceTime": "6 min"
    }
  ]
}
```

**Data Included**:
- **Counters**: Individual counter performance with assigned staff
- **Top Staff**: Top 10 performing staff members with metrics

**Metrics Provided**:
- Tickets served
- Average service time
- Current status
- Availability status

**Use Case**: Staff performance tracking, management reviews, performance rankings, incentives allocation

---

### 5. **GET /api/dashboard/services** (Service Type Analysis)
Detailed breakdown by service type

**Authentication**: Required (Staff/Admin/Manager)

**Response Structure**:
```json
{
  "message": "Service type report retrieved",
  "timestamp": "2024-12-17T10:30:00.000Z",
  "report": [
    {
      "serviceType": "registration",
      "totalTickets": 45,
      "completed": 40,
      "waiting": 3,
      "serving": 2,
      "completionRate": 89,
      "avgServiceTime": "5 min"
    },
    {
      "serviceType": "fee_payment",
      "totalTickets": 35,
      "completed": 30,
      "waiting": 4,
      "serving": 1,
      "completionRate": 86,
      "avgServiceTime": "6 min"
    },
    {
      "serviceType": "document_verification",
      "totalTickets": 28,
      "completed": 24,
      "waiting": 3,
      "serving": 1,
      "completionRate": 86,
      "avgServiceTime": "8 min"
    }
  ]
}
```

**Data Included Per Service Type**:
- Total tickets created
- Completed count
- Waiting count
- Currently serving
- Completion rate (percentage)
- Average service time

**Use Case**: Service-level analysis, resource allocation, bottleneck identification, load balancing optimization

---

## Data Aggregation Details

### Ticket Statistics Calculation
```javascript
// Waiting tickets
COUNT(status = "waiting")

// Serving tickets
COUNT(status = "serving")

// Completed tickets today
COUNT(status = "completed" AND completedAt >= TODAY)

// Average waiting time (creation to serving)
AVERAGE(servedAt - createdAt)

// Average service time (serving to completion)
AVERAGE(completedAt - servedAt)

// Completion rate
(completedTickets / totalTickets) * 100
```

### Counter Status Distribution
```javascript
// Total counters
COUNT(all)

// Active counters
COUNT(status != "closed")

// Busy counters
COUNT(status = "busy")

// Available counters
COUNT(availabilityStatus = "available")

// On maintenance
COUNT(availabilityStatus = "maintenance")

// On break
COUNT(availabilityStatus = "on_break")
```

### Staff Statistics
```javascript
// Total staff
COUNT(role = "staff")

// Active staff
COUNT(role = "staff" AND isActive = true)

// By department
GROUP BY department, COUNT
```

### Service Type Analysis
```javascript
// Tickets per service type
GROUP BY serviceType:
  - Total count
  - Count by status (waiting, serving, completed, cancelled)
  - Average service time
```

### Performance Metrics
```javascript
// Per counter
- Sum of performanceMetrics.totalTicketsServed
- Average of performanceMetrics.avgServiceTime
- Status and availability

// Top staff
GROUP BY staff:
  - Sum of assigned counters' totalTicketsServed
  - Average service time across all assignments
```

---

## Frontend Integration Example

### Using Quick Stats for Real-Time Updates
```javascript
import axios from 'axios';

const fetchQuickStats = async () => {
  try {
    const response = await axios.get('/api/dashboard/quick-stats');
    const stats = response.data.stats;
    
    // Update UI
    document.getElementById('totalTickets').textContent = stats.totalTicketsToday;
    document.getElementById('waitingCount').textContent = stats.waitingTickets;
    document.getElementById('completionRate').textContent = stats.completionRate;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

// Poll every 5 seconds
setInterval(fetchQuickStats, 5000);
```

### Using Main Dashboard for Page Load
```javascript
const fetchDashboard = async () => {
  try {
    const response = await axios.get('/api/dashboard');
    const data = response.data.data;
    
    // Render comprehensive dashboard
    renderSummary(data.summary);
    renderTicketBreakdown(data.tickets);
    renderCounterStats(data.counters);
    renderServiceTypes(data.serviceTypes);
    renderHourlyChart(data.hourlyDistribution);
    renderPriorityChart(data.priorityDistribution);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
  }
};

// Called on page load
useEffect(() => {
  fetchDashboard();
}, []);
```

### Using Performance Report
```javascript
const fetchPerformance = async () => {
  try {
    const response = await axios.get('/api/dashboard/performance');
    const { counters, topStaff } = response.data;
    
    // Render counter performance table
    renderCounterTable(counters);
    
    // Render top staff leaderboard
    renderStaffLeaderboard(topStaff);
  } catch (error) {
    console.error('Error fetching performance data:', error);
  }
};
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "message": "Server error"
}
```

**HTTP Status Codes**:
- `200`: Success
- `403`: Access denied (insufficient role)
- `500`: Server error

---

## Performance Considerations

### Database Queries
- **Dashboard**: Uses multiple aggregation pipelines for efficient counting
- **Quick Stats**: Minimal aggregations, fastest response
- **Reports**: Date-ranged queries for faster filtering
- **Performance Report**: Lookup aggregation for related data

### Recommended Polling Intervals
- **Quick Stats**: 5-10 seconds (lightweight)
- **Main Dashboard**: 30-60 seconds (comprehensive)
- **Performance Report**: 5 minutes (less frequently updated)
- **Service Report**: 10 minutes (static breakdown)

### Optimization Tips
1. Use `/quick-stats` for real-time updates instead of full dashboard
2. Cache daily reports server-side (update once per day)
3. Use pagination for large reports
4. Index frequently queried fields (status, serviceType, priority, department)

---

## Time Calculations

All time-based calculations:
- **Wait Time**: Time from ticket creation to when it starts being served
- **Service Time**: Time from when service starts to when it completes
- **Total Time**: Time from creation to completion

Results are automatically converted to:
- Seconds in database
- Minutes in API responses (for readability)

---

## Role-Based Access

| Endpoint | Customer | Staff | Admin | Manager |
|----------|----------|-------|-------|---------|
| GET / (Main) | ❌ | ✅ | ✅ | ✅ |
| GET /quick-stats | ✅ | ✅ | ✅ | ✅ |
| GET /daily-report | ❌ | ✅ | ✅ | ✅ |
| GET /performance | ❌ | ✅ | ✅ | ✅ |
| GET /services | ❌ | ✅ | ✅ | ✅ |

**Note**: `/quick-stats` is available to all authenticated users for lightweight monitoring

---

## Future Enhancements

1. **Historical Analytics**: Compare current week/month to previous periods
2. **Predictive Analytics**: Forecast peak hours and staffing needs
3. **Custom Reports**: Allow users to create custom report date ranges
4. **Export Functionality**: PDF/CSV export of reports
5. **Alerts**: Automatic alerts for SLA violations or high wait times
6. **Real-time Socket.io Broadcasting**: Push updates instead of polling
7. **Departmental Views**: Separate views for different departments
8. **SLA Metrics**: Service level agreement compliance tracking

---

## Testing the Endpoints

### Using cURL

```bash
# Get main dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard

# Get quick stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard/quick-stats

# Get daily report for specific date
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/dashboard/daily-report?date=2024-12-17"

# Get performance report
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard/performance

# Get service type report
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard/services
```

### Using Postman

1. Create a new request collection
2. Set Authorization type to "Bearer Token"
3. Add your JWT token
4. Create requests for each endpoint
5. Use the examples provided in this document

---

## Summary

The dashboard controller now provides:
- ✅ 5 comprehensive endpoints
- ✅ Real-time aggregated statistics
- ✅ Performance tracking across staff and counters
- ✅ Service-level analysis
- ✅ Historical daily reports
- ✅ System health monitoring
- ✅ Priority and hourly distribution analysis
- ✅ Optimized database queries
- ✅ Role-based access control
- ✅ Complete error handling

All endpoints are production-ready and optimized for performance.
