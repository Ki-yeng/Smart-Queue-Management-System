# Counter Availability Status Tracking Documentation

## Overview
This document describes the counter availability status tracking system, which monitors and manages the operational availability of service counters independent from their current ticket service status.

## Key Concepts

### Availability Status vs Operational Status
- **Operational Status** (status): `open`, `closed`, `busy` - What the counter is doing
- **Availability Status** (availabilityStatus): `available`, `unavailable`, `maintenance`, `on_break` - Whether the counter can be used

A counter can be:
- **Open + Available** → Ready to serve customers
- **Open + Maintenance** → Not available due to equipment issues
- **Busy + Available** → Currently serving, but available for next ticket
- **Closed + Unavailable** → Not operational

---

## Model Fields

### Availability Tracking Fields
```javascript
{
  // Current availability status
  availabilityStatus: 'available' | 'unavailable' | 'maintenance' | 'on_break',
  
  // When availability last changed
  lastAvailabilityChange: Date,
  
  // Why counter is unavailable
  unavailabilityReason: String,
  
  // Expected return time for maintenance/break
  estimatedReturnTime: Date,
  
  // Complete history of all availability changes
  availabilityHistory: [
    {
      status: String,
      changedAt: Date,
      changedUntil: Date,
      reason: String,
      changedBy: ObjectId (User)
    }
  ],
  
  // Performance metrics
  performanceMetrics: {
    totalTicketsServed: Number,
    avgServiceTime: Number,
    lastMaintenanceDate: Date,
    uptimePercentage: Number
  }
}
```

---

## API Endpoints

### 1. Update Counter Availability Status
**Route:** `PUT /api/counters/:counterId/availability`
**Auth:** Admin only
**Description:** Change counter availability status with reason

**Request Body:**
```json
{
  "availabilityStatus": "maintenance",
  "reason": "Computer monitor replaced",
  "estimatedReturnTime": "2026-01-20T14:30:00Z"  // Optional
}
```

**Response:**
```json
{
  "message": "Counter availability updated to maintenance",
  "counter": {
    "_id": "...",
    "counterName": "Counter 1",
    "availabilityStatus": "maintenance",
    "lastAvailabilityChange": "2026-01-20T13:00:00Z",
    "unavailabilityReason": "Computer monitor replaced",
    "estimatedReturnTime": "2026-01-20T14:30:00Z",
    "availabilityHistory": [...]
  },
  "change": {
    "from": "available",
    "to": "maintenance",
    "reason": "Computer monitor replaced",
    "changedAt": "2026-01-20T13:00:00Z"
  }
}
```

---

### 2. Get Counter Availability Status
**Route:** `GET /api/counters/:counterId/availability`
**Auth:** Admin only
**Description:** Get detailed availability information and history

**Response:**
```json
{
  "counterId": "...",
  "counterName": "Counter 1",
  "currentAvailability": {
    "status": "maintenance",
    "lastChange": "2026-01-20T13:00:00Z",
    "reason": "Computer monitor replaced",
    "estimatedReturn": "2026-01-20T14:30:00Z"
  },
  "availabilityHistory": [
    {
      "status": "available",
      "changedAt": "2026-01-20T08:00:00Z",
      "changedUntil": "2026-01-20T13:00:00Z",
      "reason": "Morning shift",
      "changedBy": { "_id": "...", "name": "Admin User" }
    }
  ],
  "performanceMetrics": {
    "totalTicketsServed": 245,
    "avgServiceTime": 8.5,
    "lastMaintenanceDate": "2026-01-20T13:00:00Z",
    "uptimePercentage": 98.5
  }
}
```

---

### 3. Get Available Counters
**Route:** `GET /api/counters/available?serviceType=Finance`
**Auth:** Public
**Description:** Get all counters currently available for serving

**Query Parameters:**
- `serviceType` (optional) - Filter by service type (e.g., Finance, Admissions)

**Response:**
```json
{
  "message": "3 available counters",
  "total": 3,
  "serviceType": "Finance",
  "counters": [
    {
      "counterId": "...",
      "counterName": "Counter 1",
      "serviceTypes": ["Finance", "Admissions"],
      "status": "open",
      "availabilityStatus": "available",
      "assignedStaff": {
        "_id": "...",
        "name": "John Doe",
        "email": "john@kcau.edu"
      },
      "currentTicket": null,
      "lastAvailabilityChange": "2026-01-20T08:00:00Z"
    }
  ]
}
```

---

### 4. Set Counter for Maintenance
**Route:** `PUT /api/counters/:counterId/maintenance`
**Auth:** Admin only
**Description:** Mark counter as under maintenance with expected return time

**Request Body:**
```json
{
  "reason": "Software update required",
  "estimatedReturnTime": "2026-01-20T15:00:00Z"  // Optional
}
```

**Response:**
```json
{
  "message": "Counter set for maintenance: Software update required",
  "counter": { ... },
  "maintenanceInfo": {
    "reason": "Software update required",
    "startedAt": "2026-01-20T13:30:00Z",
    "estimatedReturn": "2026-01-20T15:00:00Z"
  }
}
```

---

### 5. Resume Counter from Maintenance/Break
**Route:** `PUT /api/counters/:counterId/resume`
**Auth:** Admin only
**Description:** Bring counter back online from maintenance or break

**Request Body:**
```json
{
  "reason": "Maintenance completed"  // Optional
}
```

**Response:**
```json
{
  "message": "Counter Counter 1 resumed and available",
  "counter": { ... },
  "resumeInfo": {
    "reason": "Maintenance completed",
    "resumedAt": "2026-01-20T14:30:00Z"
  }
}
```

---

### 6. Get Availability Statistics
**Route:** `GET /api/counters/stats/availability`
**Auth:** Admin only
**Description:** Get aggregate availability statistics across all counters

**Response:**
```json
{
  "message": "Counter availability statistics",
  "timestamp": "2026-01-20T15:45:00Z",
  "stats": {
    "totalCounters": 8,
    "availableCounters": 6,
    "unavailableCounters": 1,
    "maintenanceCounters": 1,
    "onBreakCounters": 0,
    "averageUptimePercentage": "98.75",
    "byServiceType": {
      "Finance": {
        "total": 3,
        "available": 2,
        "unavailable": 1,
        "maintenance": 0,
        "onBreak": 0
      },
      "Admissions": {
        "total": 2,
        "available": 2,
        "unavailable": 0,
        "maintenance": 0,
        "onBreak": 0
      }
    }
  }
}
```

---

## Availability Status Meanings

### `available`
- Counter is operational and ready to serve
- Staff is present and assigned
- Equipment is functioning properly
- Can accept new tickets

### `unavailable`
- Counter is temporarily unavailable
- Due to equipment issues, staff absence, or other problems
- Can be resumed with notice
- Tickets should be redirected to other counters

### `maintenance`
- Counter is undergoing scheduled or emergency maintenance
- Equipment repairs, software updates, cleaning
- Expected to return online at specified time
- No tickets should be routed to this counter

### `on_break`
- Counter is on a scheduled break (lunch, rest period)
- Expected to return at specific time
- Can resume immediately when needed
- Tickets can wait for return or be redirected

---

## Usage Examples

### Example 1: Morning Setup
```javascript
// Open counter and set as available
PUT /api/counters/counter1/availability
{
  "availabilityStatus": "available",
  "reason": "Morning shift started"
}
```

### Example 2: Equipment Problem
```javascript
// Mark counter as unavailable due to printer issue
PUT /api/counters/counter2/availability
{
  "availabilityStatus": "unavailable",
  "reason": "Printer not working",
  "estimatedReturnTime": "2026-01-20T14:00:00Z"
}
```

### Example 3: Schedule Maintenance
```javascript
// Set counter for planned maintenance
PUT /api/counters/counter3/maintenance
{
  "reason": "Monthly preventive maintenance - software update",
  "estimatedReturnTime": "2026-01-20T15:30:00Z"
}
```

### Example 4: Check System Health
```javascript
// Get statistics on all counter availability
GET /api/counters/stats/availability

// Response shows:
// - 7 available counters
// - 1 under maintenance
// - 98.5% average uptime
// - Breakdown by service type
```

### Example 5: Find Available Finance Counters
```javascript
// Public endpoint - get available counters for Finance service
GET /api/counters/available?serviceType=Finance

// Returns list of open Finance counters ready to serve
```

---

## Real-World Workflow

### Daily Operation Cycle

**8:00 AM - Opening**
```javascript
counters.forEach(counter => {
  PUT /api/counters/${counter}/availability
  { availabilityStatus: "available", reason: "Opening" }
});
```

**12:00 PM - Lunch Break**
```javascript
// Staff 1 goes to lunch
PUT /api/counters/counter1/availability
{ availabilityStatus: "on_break", estimatedReturnTime: "2026-01-20T13:00:00Z" }
```

**1:30 PM - Emergency Issue Reported**
```javascript
// Counter 3 has monitor problem
PUT /api/counters/counter3/unavailability
{
  availabilityStatus: "unavailable",
  reason: "Monitor display error",
  estimatedReturnTime: "2026-01-20T14:30:00Z"
}
```

**2:30 PM - Maintenance Completed**
```javascript
// Counter 3 fixed and ready
PUT /api/counters/counter3/resume
{ reason: "Monitor replaced and tested" }
```

**5:00 PM - Closing**
```javascript
counters.forEach(counter => {
  PUT /api/counters/${counter}/availability
  { availabilityStatus: "unavailable", reason: "Daily closing" }
});
```

---

## Integration with Dashboard

### Real-Time Updates
- All availability changes broadcast via Socket.IO
- Dashboard automatically updates availability indicators
- Alerts when counters go down or come back online

### Queue Management
- Queue system automatically redirects tickets from unavailable counters
- Tracks which counters are available for which services
- Optimizes ticket distribution based on availability

### Performance Tracking
- Uptime percentage calculated automatically
- Service time metrics updated per counter
- Historical maintenance data tracked

---

## Best Practices

1. **Always provide a reason** - Helps operational tracking
2. **Set estimated return times** - Helps queue management
3. **Record maintenance dates** - Track equipment lifecycle
4. **Monitor uptime metrics** - Identify problematic counters
5. **Check availability stats regularly** - Plan staffing and maintenance
6. **Use "on_break" for temporary unavailability** - Distinguishes from problems
7. **Use "maintenance" for scheduled work** - Clear communication to staff

---

## Monitoring & Alerting

### Critical Thresholds
- Alert if counter unavailable > 2 hours
- Alert if multiple counters unavailable for same service
- Alert if uptime drops below 95%

### Maintenance Scheduling
- Track maintenance history per counter
- Schedule preventive maintenance on low-usage times
- Plan maintenance windows during off-peak hours

### Performance Optimization
- Use uptime data to identify equipment issues
- Track average service time trends
- Optimize staffing based on availability patterns
