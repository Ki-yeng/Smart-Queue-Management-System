# Counter Status Endpoints - API Reference

## Overview

Two new endpoints added to get comprehensive counter status information with queue metrics, staff assignments, and operational details.

## Endpoints

### 1. Get All Counters with Status
```http
GET /api/counters/status/all
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Description:** Get all counters with detailed status information

**Response (200 OK):**
```json
{
  "message": "All counters with current status",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "totalCounters": 12,
  "operationalCounters": 10,
  "busyCounters": 8,
  "counters": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "counterName": "Counter 1",
      "serviceType": "Finance",
      "serviceTypes": ["Finance", "General Enquiries"],
      "operationalStatus": {
        "status": "open",
        "description": "Counter is open and ready to serve customers"
      },
      "availabilityStatus": {
        "status": "available",
        "description": "Counter is fully operational",
        "lastChanged": "2024-01-20T09:00:00.000Z"
      },
      "staffAssignment": {
        "staffId": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@kcau.ac.ke",
        "department": "Finance",
        "role": "staff"
      },
      "currentTicket": {
        "ticketId": "507f1f77bcf86cd799439013",
        "ticketNumber": 45,
        "priority": "normal",
        "serviceType": "Finance",
        "status": "serving"
      },
      "queueMetrics": {
        "totalQueueLength": 3,
        "waitingCount": 2,
        "servingCount": 1,
        "estimatedWaitTime": 6
      },
      "isOperational": true,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "counterName": "Counter 2",
      "serviceType": "Admissions",
      "serviceTypes": ["Admissions"],
      "operationalStatus": {
        "status": "closed",
        "description": "Counter is closed and not accepting customers"
      },
      "availabilityStatus": {
        "status": "unavailable",
        "description": "Counter is temporarily unavailable",
        "lastChanged": "2024-01-20T10:15:00.000Z"
      },
      "staffAssignment": null,
      "currentTicket": null,
      "queueMetrics": {
        "totalQueueLength": 0,
        "waitingCount": 0,
        "servingCount": 0,
        "estimatedWaitTime": 0
      },
      "isOperational": false,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-20T10:25:00.000Z"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| counterName | string | Display name of the counter |
| serviceType | string | Primary service type |
| serviceTypes | array | All service types handled |
| operationalStatus | object | Current operational state (open/closed/busy) |
| availabilityStatus | object | Availability state (available/unavailable/maintenance/on_break) |
| staffAssignment | object\|null | Assigned staff member details |
| currentTicket | object\|null | Ticket currently being served |
| queueMetrics | object | Queue information and metrics |
| isOperational | boolean | Whether counter can serve customers |

---

### 2. Get Specific Counter Status
```http
GET /api/counters/status/:id
Authorization: Bearer <token>
```

**Authentication:** Staff/Admin  
**Parameters:**
- `:id` - Counter ID (ObjectId)

**Response (200 OK):**
```json
{
  "message": "Counter status retrieved",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "counter": {
    "_id": "507f1f77bcf86cd799439011",
    "counterName": "Counter 1",
    "serviceType": "Finance",
    "serviceTypes": ["Finance", "General Enquiries"],
    "operationalStatus": {
      "status": "busy",
      "description": "Counter is currently serving a customer"
    },
    "availabilityStatus": {
      "status": "available",
      "description": "Counter is fully operational",
      "lastChanged": "2024-01-20T09:00:00.000Z"
    },
    "staffAssignment": {
      "staffId": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@kcau.ac.ke",
      "department": "Finance",
      "role": "staff"
    },
    "currentTicket": {
      "ticketId": "507f1f77bcf86cd799439013",
      "ticketNumber": 45,
      "priority": "normal",
      "serviceType": "Finance",
      "status": "serving",
      "servedSince": "2024-01-20T10:25:00.000Z"
    },
    "queueMetrics": {
      "totalQueueLength": 3,
      "waitingCount": 2,
      "servingCount": 1,
      "estimatedWaitTime": 6
    },
    "isOperational": true,
    "assignmentHistory": 5,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "message": "Counter not found"
}
```

500 Server Error:
```json
{
  "message": "Server error"
}
```

---

## Operational Status Values

| Status | Description | Can Accept Customers |
|--------|-------------|----------------------|
| `open` | Counter is open and ready to serve | Yes |
| `closed` | Counter is closed | No |
| `busy` | Counter is currently serving a customer | No (until available) |

---

## Availability Status Values

| Status | Description | Duration |
|--------|-------------|----------|
| `available` | Fully operational | Ongoing |
| `unavailable` | Temporarily unavailable | Temporary |
| `maintenance` | Under maintenance | Scheduled |
| `on_break` | Staff on break | Limited time |

---

## Queue Metrics Explanation

| Metric | Calculation | Example |
|--------|-------------|---------|
| **totalQueueLength** | waitingCount + servingCount | 3 |
| **waitingCount** | Customers waiting in queue | 2 |
| **servingCount** | Currently being served (0 or 1) | 1 |
| **estimatedWaitTime** | (waitingCount - 1) × 3 minutes | 6 mins |

---

## Usage Examples

### JavaScript/Fetch

```javascript
// Get all counters with status
async function getAllCounterStatus() {
  const response = await fetch('http://localhost:5000/api/counters/status/all', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log(data.counters);
}

// Get specific counter status
async function getCounterStatus(counterId) {
  const response = await fetch(
    `http://localhost:5000/api/counters/status/${counterId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  console.log(data.counter);
}
```

### Axios

```javascript
import axios from 'axios';

// Get all counters with status
async function getAllCounterStatus() {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/counters/status/all',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log(response.data.counters);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get specific counter status
async function getCounterStatus(counterId) {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/counters/status/${counterId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log(response.data.counter);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### React Component

```jsx
import { useEffect, useState } from 'react';

export default function CounterStatusBoard() {
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounterStatus();
  }, []);

  const fetchCounterStatus = async () => {
    try {
      const response = await fetch('/api/counters/status/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCounters(data.counters);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2>Counters: {counters.filter(c => c.isOperational).length}/{counters.length} operational</h2>
      {counters.map(counter => (
        <div key={counter._id} className={`p-4 rounded border ${
          counter.isOperational ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
        }`}>
          <h3>{counter.counterName}</h3>
          <p>Status: {counter.operationalStatus.status}</p>
          <p>Staff: {counter.staffAssignment?.name || 'Unassigned'}</p>
          <p>Queue: {counter.queueMetrics.totalQueueLength} customers (Est. wait: {counter.queueMetrics.estimatedWaitTime} min)</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Filtering & Sorting

To filter by operational status on the frontend:

```javascript
// Get only operational counters
const operational = counters.filter(c => c.isOperational);

// Get only busy counters
const busy = counters.filter(c => c.operationalStatus.status === 'busy');

// Sort by queue length (longest first)
const sorted = counters.sort((a, b) => 
  b.queueMetrics.totalQueueLength - a.queueMetrics.totalQueueLength
);
```

---

## Integration with Other Features

These endpoints complement:
- **Load Balancing Dashboard** - Shows simplified metrics
- **Ticket Management** - Shows current serving status
- **Staff Assignment** - Shows staff-counter relationships
- **Availability Tracking** - Shows maintenance/break status

---

## Related Endpoints

- `GET /api/counters` - Basic counter list
- `GET /api/counters/load-balancing/dashboard` - Load metrics
- `GET /api/counters/assignments/all` - Staff assignments
- `GET /api/counters/stats/availability` - Availability statistics

---

**Created:** January 20, 2026  
**Version:** 1.0  
**Status:** Ready for use ✅
