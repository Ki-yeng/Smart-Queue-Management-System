# Socket.IO Real-Time Events Documentation

## Overview
This document describes all Socket.IO events that broadcast ticket status updates in real-time across the queue management system.

## Client Connection & Room Management

### Emit Events (Client → Server)

#### 1. Join Dashboard Room
```javascript
socket.emit('joinDashboard');
```
**Purpose:** Join the dashboard room to receive all queue and counter updates
**Used By:** Staff dashboard, admin dashboard
**Response:** No direct response, but will start receiving dashboard events

---

#### 2. Join Service Queue
```javascript
socket.emit('joinServiceQueue', { 
  serviceType: 'Finance' // or 'Admissions', 'Examinations', etc.
});
```
**Purpose:** Join queue for a specific service type (e.g., Finance counter)
**Used By:** Staff monitoring specific service queues
**Response:** Will receive service-specific ticket events

---

#### 3. Join Counter Room
```javascript
socket.emit('joinCounter', { 
  counterId: '62e8f5c1d8a0b2c3e4f5g6h7' 
});
```
**Purpose:** Join a specific counter's room for counter-specific updates
**Used By:** Counter staff
**Response:** Will receive counter status updates

---

#### 4. Join User Room (Personal Notifications)
```javascript
socket.emit('joinUserRoom', { 
  userId: '62e8f5c1d8a0b2c3e4f5g6h7' 
});
```
**Purpose:** Subscribe to personal ticket updates
**Used By:** Students/customers for personal ticket status
**Response:** Will receive personal ticket notifications

---

#### 5. Leave Room
```javascript
socket.emit('leaveRoom', { 
  room: 'service-Finance' 
});
```
**Purpose:** Unsubscribe from a specific room
**Used By:** Any client
**Response:** Will stop receiving events from that room

---

## Listen Events (Server → Client)

### Ticket Status Events

#### 1. ticketCreated
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketCreated', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'waiting',
  //   priority: 'normal',
  //   message: 'New ticket #101 created',
  //   timestamp: '2026-01-20T10:30:00.000Z'
  // }
});
```

---

#### 2. ticketServing
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketServing', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'serving',
  //   priority: 'normal',
  //   message: 'Ticket #101 is now being served at Counter 1',
  //   counterId: '62e8f5c1d8a0b2c3e4f5g6h8',
  //   counterName: 'Counter 1',
  //   timestamp: '2026-01-20T10:30:45.000Z'
  // }
});
```

---

#### 3. ticketCompleted
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketCompleted', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'completed',
  //   priority: 'normal',
  //   message: 'Ticket #101 has been completed',
  //   completedAt: '2026-01-20T10:35:00.000Z',
  //   counterName: 'Counter 1',
  //   timestamp: '2026-01-20T10:35:00.000Z'
  // }
});
```

---

#### 4. ticketCancelled
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketCancelled', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'cancelled',
  //   priority: 'normal',
  //   message: 'Ticket #101 has been cancelled',
  //   cancelledAt: '2026-01-20T10:40:00.000Z',
  //   timestamp: '2026-01-20T10:40:00.000Z'
  // }
});
```

---

#### 5. ticketTransferred
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketTransferred', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'serving',
  //   priority: 'normal',
  //   message: 'Ticket #101 transferred from Counter 1 to Counter 2',
  //   fromCounterId: '62e8f5c1d8a0b2c3e4f5g6h8',
  //   fromCounterName: 'Counter 1',
  //   toCounterId: '62e8f5c1d8a0b2c3e4f5g6h9',
  //   toCounterName: 'Counter 2',
  //   transferHistory: [...],
  //   timestamp: '2026-01-20T10:32:00.000Z'
  // }
});
```

---

#### 6. ticketPriorityUpdated
**Broadcasts to:** `service-{serviceType}`, `dashboard`, `user-{userId}`
```javascript
socket.on('ticketPriorityUpdated', (data) => {
  console.log(data);
  // {
  //   ticketId: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   ticketNumber: 101,
  //   serviceType: 'Finance',
  //   status: 'waiting',
  //   priority: 'vip',
  //   message: 'Ticket #101 priority changed from normal to vip',
  //   oldPriority: 'normal',
  //   newPriority: 'vip',
  //   priorityScore: 250,
  //   timestamp: '2026-01-20T10:33:00.000Z'
  // }
});
```

---

### Queue & Counter Events

#### 7. queueUpdated
**Broadcasts to:** `service-{serviceType}`
```javascript
socket.on('queueUpdated', (data) => {
  console.log(data);
  // {
  //   serviceType: 'Finance',
  //   totalWaiting: 5,
  //   tickets: [
  //     { ticketNumber: 101, priority: 'vip', status: 'waiting', createdAt: '...' },
  //     { ticketNumber: 102, priority: 'normal', status: 'waiting', createdAt: '...' },
  //     ...
  //   ],
  //   timestamp: '2026-01-20T10:35:00.000Z'
  // }
});
```

---

#### 8. counterStatusUpdated
**Broadcasts to:** `dashboard`, `counter-{counterId}`
```javascript
socket.on('counterStatusUpdated', (data) => {
  console.log(data);
  // {
  //   counterId: '62e8f5c1d8a0b2c3e4f5g6h8',
  //   counterName: 'Counter 1',
  //   status: 'busy', // or 'open', 'closed'
  //   currentTicket: '62e8f5c1d8a0b2c3e4f5g6h7',
  //   timestamp: '2026-01-20T10:30:45.000Z'
  // }
});
```

---

#### 9. dashboardStatsUpdated
**Broadcasts to:** `dashboard`
```javascript
socket.on('dashboardStatsUpdated', (data) => {
  console.log(data);
  // {
  //   totalWaiting: 12,
  //   totalServing: 5,
  //   totalCompleted: 48,
  //   averageWaitTime: 8,
  //   busyCounters: 5,
  //   totalCounters: 8,
  //   byService: {
  //     'Finance': { waiting: 3, serving: 1, completed: 10 },
  //     'Admissions': { waiting: 2, serving: 1, completed: 8 },
  //     ...
  //   },
  //   timestamp: '2026-01-20T10:35:00.000Z'
  // }
});
```

---

## Implementation Examples

### Example 1: Staff Dashboard
```javascript
import { socket } from './socket.js';

// Connect socket
socket.connect();

// Join dashboard to get all updates
socket.emit('joinDashboard');

// Also join specific service queues
socket.emit('joinServiceQueue', { serviceType: 'Finance' });
socket.emit('joinServiceQueue', { serviceType: 'Admissions' });

// Listen to all ticket events
socket.on('ticketCreated', (data) => {
  console.log(`New ticket #${data.ticketNumber}`);
  // Update UI with new ticket
});

socket.on('ticketServing', (data) => {
  console.log(`Ticket #${data.ticketNumber} now being served`);
  // Update UI
});

socket.on('counterStatusUpdated', (data) => {
  console.log(`${data.counterName} is now ${data.status}`);
  // Update counter UI
});
```

### Example 2: Customer Ticket Status
```javascript
import { socket } from './socket.js';

socket.connect();

// Join personal room to receive only your ticket updates
socket.emit('joinUserRoom', { userId: currentUserId });

// Listen to personal ticket events
socket.on('ticketServing', (data) => {
  if (data.userId === currentUserId) {
    alert(`Your ticket #${data.ticketNumber} is being served at ${data.counterName}!`);
  }
});

socket.on('ticketCompleted', (data) => {
  alert(`Your ticket #${data.ticketNumber} has been completed!`);
});
```

### Example 3: Counter Staff
```javascript
import { socket } from './socket.js';

socket.connect();

// Join counter-specific room
socket.emit('joinCounter', { counterId: counterStaffId });

// Join service queue
socket.emit('joinServiceQueue', { serviceType: 'Finance' });

// Listen for next ticket to serve
socket.on('ticketCreated', (data) => {
  if (data.serviceType === 'Finance') {
    // Update queue display
  }
});
```

---

## Broadcasting Rooms

| Room | Triggered By | Receives |
|------|-------------|----------|
| `service-{serviceType}` | Ticket actions for service type | All staff monitoring that service |
| `dashboard` | All ticket and counter updates | Dashboard users |
| `user-{userId}` | Ticket actions | Specific user/customer |
| `counter-{counterId}` | Counter status changes | Counter-specific notifications |

---

## Best Practices

1. **Join appropriate rooms on component mount, leave on unmount**
   ```javascript
   useEffect(() => {
     socket.emit('joinDashboard');
     return () => socket.emit('leaveRoom', { room: 'dashboard' });
   }, []);
   ```

2. **Handle reconnection gracefully**
   ```javascript
   socket.on('reconnect', () => {
     // Rejoin rooms after reconnection
     socket.emit('joinDashboard');
   });
   ```

3. **Filter events by userId if needed**
   ```javascript
   socket.on('ticketServing', (data) => {
     if (data.userId === currentUserId) {
       // Handle personal notification
     }
   });
   ```

4. **Update UI efficiently (avoid unnecessary re-renders)**
   ```javascript
   socket.on('ticketCreated', (data) => {
     setTickets(prev => {
       // Check if ticket already exists
       if (!prev.find(t => t._id === data.ticketId)) {
         return [data, ...prev];
       }
       return prev;
     });
   });
   ```

---

## Testing Socket Events

### Using Socket.IO Dev Tools
```javascript
// Test emitting events
socket.emit('joinDashboard');
socket.emit('joinServiceQueue', { serviceType: 'Finance' });

// Monitor received events in console
socket.onAny((event, data) => {
  console.log(`Received event: ${event}`, data);
});
```

---

## Troubleshooting

### Events not being received?
1. Check client is in correct room
   ```javascript
   console.log('Socket rooms:', socket.rooms);
   ```

2. Verify Socket.IO connection
   ```javascript
   console.log('Socket connected:', socket.connected);
   ```

3. Check browser console for connection errors

### Events delayed?
- May indicate network latency
- Check Socket.IO ping/pong configuration
- Verify server is healthy

### Lost connection?
- Socket.IO will auto-reconnect with exponential backoff
- Listen for `reconnect` event to rejoin rooms
