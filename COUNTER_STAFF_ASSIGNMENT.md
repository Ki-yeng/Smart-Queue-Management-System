# Counter Staff Assignment API Documentation

## Overview
This document describes the API endpoints for managing staff assignments to service counters in the queue management system.

## Model Updates

### Counter Model
The Counter model now includes:
- **assignedStaff** (ObjectId ref User) - Current staff member assigned to counter
- **assignmentHistory** (Array) - Track all staff assignments and changes with timestamps
- **serviceTypes** (Array) - Multiple service types a counter can handle

### Assignment History Entry
```javascript
{
  staffId: ObjectId,        // Reference to User
  staffName: String,        // Staff name at time of assignment
  assignedAt: Date,         // When assignment started
  unassignedAt: Date,       // When assignment ended (optional)
  reason: String            // Reason for change
}
```

---

## API Endpoints

### 1. Assign Staff to Counter
**Route:** `PUT /api/counters/:counterId/assign-staff`
**Auth:** Admin only
**Description:** Assign a staff member to a counter

**Request Body:**
```json
{
  "staffId": "62e8f5c1d8a0b2c3e4f5g6h7",
  "reason": "Regular shift assignment"  // Optional
}
```

**Response:**
```json
{
  "message": "Staff member John Doe assigned to Counter 1",
  "counter": {
    "_id": "62e8f5c1d8a0b2c3e4f5g6h8",
    "counterName": "Counter 1",
    "serviceTypes": ["Finance", "Admissions"],
    "status": "open",
    "assignedStaff": {
      "_id": "62e8f5c1d8a0b2c3e4f5g6h7",
      "name": "John Doe",
      "email": "john@kcau.edu",
      "department": "Finance"
    },
    "currentTicket": null,
    "assignmentHistory": [...]
  },
  "assignment": {
    "staffName": "John Doe",
    "staffEmail": "john@kcau.edu",
    "counterName": "Counter 1",
    "reason": "Regular shift assignment"
  }
}
```

**Error Responses:**
- `400` - Missing staffId
- `404` - Counter or staff member not found
- `400` - User is not a staff member

---

### 2. Unassign Staff from Counter
**Route:** `PUT /api/counters/:counterId/unassign-staff`
**Auth:** Admin only
**Description:** Remove staff member from counter

**Request Body:**
```json
{
  "reason": "Shift ended"  // Optional
}
```

**Response:**
```json
{
  "message": "Staff member John Doe unassigned from Counter 1",
  "counter": {
    "_id": "62e8f5c1d8a0b2c3e4f5g6h8",
    "counterName": "Counter 1",
    "assignedStaff": null,
    "assignmentHistory": [...]
  },
  "unassignment": {
    "staffName": "John Doe",
    "counterName": "Counter 1",
    "reason": "Shift ended",
    "unassignedAt": "2026-01-20T15:30:00.000Z"
  }
}
```

**Error Responses:**
- `404` - Counter not found
- `400` - No staff member assigned

---

### 3. Get Assignment History for Counter
**Route:** `GET /api/counters/:counterId/assignment-history`
**Auth:** Admin only
**Description:** Get complete assignment history for a counter

**Response:**
```json
{
  "counter": "Counter 1",
  "currentStaff": {
    "_id": "62e8f5c1d8a0b2c3e4f5g6h7",
    "name": "John Doe",
    "email": "john@kcau.edu"
  },
  "assignmentHistory": [
    {
      "staffId": "62e8f5c1d8a0b2c3e4f5g6h7",
      "staffName": "John Doe",
      "assignedAt": "2026-01-20T08:00:00.000Z",
      "unassignedAt": "2026-01-20T12:00:00.000Z",
      "reason": "Morning shift"
    },
    {
      "staffId": "62e8f5c1d8a0b2c3e4f5g6h9",
      "staffName": "Jane Smith",
      "assignedAt": "2026-01-20T12:00:00.000Z",
      "unassignedAt": "2026-01-20T16:00:00.000Z",
      "reason": "Afternoon shift"
    }
  ],
  "totalAssignments": 2
}
```

---

### 4. Get All Counter-Staff Assignments
**Route:** `GET /api/counters/assignments/all`
**Auth:** Admin only
**Description:** Get all counters with their current staff assignments

**Response:**
```json
{
  "message": "Counter staff assignments",
  "total": 8,
  "assignments": [
    {
      "counterId": "62e8f5c1d8a0b2c3e4f5g6h8",
      "counterName": "Counter 1",
      "serviceTypes": ["Finance", "Admissions"],
      "status": "open",
      "assignedStaff": {
        "id": "62e8f5c1d8a0b2c3e4f5g6h7",
        "name": "John Doe",
        "email": "john@kcau.edu",
        "department": "Finance"
      },
      "currentTicket": {
        "_id": "62e8f5c1d8a0b2c3e4f5g6h1",
        "ticketNumber": 45,
        "priority": "normal"
      }
    },
    {
      "counterId": "62e8f5c1d8a0b2c3e4f5g6h9",
      "counterName": "Counter 2",
      "serviceTypes": ["Examinations"],
      "status": "open",
      "assignedStaff": {
        "id": "62e8f5c1d8a0b2c3e4f5g6h2",
        "name": "Jane Smith",
        "email": "jane@kcau.edu",
        "department": "Examinations"
      },
      "currentTicket": null
    }
  ]
}
```

---

### 5. Get Counters Assigned to Staff Member
**Route:** `GET /api/counters/by-staff/:staffId`
**Auth:** Admin only
**Description:** Get all counters assigned to a specific staff member

**Response:**
```json
{
  "message": "Counters assigned to John Doe",
  "staffId": "62e8f5c1d8a0b2c3e4f5g6h7",
  "staffName": "John Doe",
  "assignedCounters": [
    {
      "_id": "62e8f5c1d8a0b2c3e4f5g6h8",
      "counterName": "Counter 1",
      "serviceTypes": ["Finance", "Admissions"],
      "status": "open",
      "assignedStaff": "62e8f5c1d8a0b2c3e4f5g6h7",
      "currentTicket": {
        "_id": "62e8f5c1d8a0b2c3e4f5g6h1",
        "ticketNumber": 45,
        "priority": "normal",
        "status": "serving"
      }
    }
  ],
  "totalCounters": 1
}
```

---

## Usage Examples

### Example 1: Admin assigns staff to counter
```bash
curl -X PUT http://localhost:5000/api/counters/62e8f5c1d8a0b2c3e4f5g6h8/assign-staff \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "staffId": "62e8f5c1d8a0b2c3e4f5g6h7",
    "reason": "Morning shift (8am-12pm)"
  }'
```

### Example 2: View all staff assignments
```bash
curl -X GET http://localhost:5000/api/counters/assignments/all \
  -H "Authorization: Bearer <token>"
```

### Example 3: Check assignment history for counter
```bash
curl -X GET http://localhost:5000/api/counters/62e8f5c1d8a0b2c3e4f5g6h8/assignment-history \
  -H "Authorization: Bearer <token>"
```

### Example 4: View staff member's assigned counters
```bash
curl -X GET http://localhost:5000/api/counters/by-staff/62e8f5c1d8a0b2c3e4f5g6h7 \
  -H "Authorization: Bearer <token>"
```

### Example 5: Unassign staff from counter
```bash
curl -X PUT http://localhost:5000/api/counters/62e8f5c1d8a0b2c3e4f5g6h8/unassign-staff \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Shift ended - transitioning to next staff"
  }'
```

---

## Real-World Workflow

### Daily Morning Setup
```javascript
// Admin logs in and assigns staff for the morning shift
const counters = [
  { counterId: "counter1", staffId: "john_doe" },
  { counterId: "counter2", staffId: "jane_smith" },
  { counterId: "counter3", staffId: "bob_wilson" },
];

counters.forEach(async (assignment) => {
  await axios.put(
    `/api/counters/${assignment.counterId}/assign-staff`,
    {
      staffId: assignment.staffId,
      reason: "Morning shift (8am-12pm)"
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
});
```

### Shift Change (Noon)
```javascript
// Unassign morning staff
const morningStaff = [
  { counterId: "counter1", staffId: "john_doe" },
  { counterId: "counter2", staffId: "jane_smith" },
];

// Assign afternoon staff
const afternoonStaff = [
  { counterId: "counter1", staffId: "alice_johnson" },
  { counterId: "counter2", staffId: "charlie_brown" },
];

// Unassign all
morningStaff.forEach(async ({ counterId }) => {
  await axios.put(
    `/api/counters/${counterId}/unassign-staff`,
    { reason: "Morning shift ended" },
    { headers: { Authorization: `Bearer ${token}` } }
  );
});

// Assign new staff
afternoonStaff.forEach(async ({ counterId, staffId }) => {
  await axios.put(
    `/api/counters/${counterId}/assign-staff`,
    {
      staffId,
      reason: "Afternoon shift (12pm-4pm)"
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
});
```

### View Staff Performance (Assignment Duration)
```javascript
// Get history to see how long each staff member served
const response = await axios.get(
  `/api/counters/62e8f5c1d8a0b2c3e4f5g6h8/assignment-history`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const history = response.data.assignmentHistory;
history.forEach(assignment => {
  const duration = new Date(assignment.unassignedAt) - new Date(assignment.assignedAt);
  console.log(`${assignment.staffName}: ${duration / (1000 * 60)} minutes`);
});
```

---

## Integration with Dashboard

The staff assignment information is automatically:
1. **Broadcast via Socket.IO** - Changes emit `counterStatusUpdated` event to dashboard
2. **Included in counter responses** - All counter queries include `assignedStaff` data
3. **Tracked in history** - Every assignment change is recorded with timestamp and reason

---

## Database Schema Impact

```javascript
// Counter document structure
{
  _id: ObjectId,
  counterName: "Counter 1",
  serviceTypes: ["Finance", "Admissions"],
  status: "open",
  currentTicket: ObjectId | null,
  assignedStaff: ObjectId | null,           // NEW
  assignmentHistory: [                       // NEW
    {
      staffId: ObjectId,
      staffName: String,
      assignedAt: Date,
      unassignedAt: Date,
      reason: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Best Practices

1. **Always provide a reason** - Helps audit trail and operational clarity
2. **Unassign before reassigning** - Maintains clean history
3. **Check assignment history** - Monitor staff utilization
4. **Use socketio for real-time updates** - Frontend gets instant notifications
5. **Validate staff role** - System ensures user is staff/admin before assignment
