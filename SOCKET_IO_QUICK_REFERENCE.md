# Socket.IO Setup - Quick Reference

## ✅ Status: Complete

Socket.IO connection setup in `backend/src/index.js` is fully implemented and production-ready.

---

## 🚀 Quick Start

### 1. Verify Installation
```bash
cd backend
npm install socket.io  # If not already installed
npm run dev
```

### 2. Check Server Output
```
✅ Socket.IO initialized successfully
📊 Load balancing monitor started (broadcasts every 10 seconds)
🚀 Server running on port 5000
```

### 3. Test in Browser Console
```javascript
const socket = io('http://localhost:5000');
socket.on('connected', (data) => console.log('Connected:', data));
socket.emit('joinDashboard', { userRole: 'admin' });
```

---

## 📋 Key Features

| Feature | Status |
|---------|--------|
| Server initialization | ✅ |
| CORS configuration | ✅ |
| Client tracking | ✅ |
| Room management | ✅ |
| Event broadcasting | ✅ |
| Error handling | ✅ |
| Load balancer integration | ✅ |
| Utility functions | ✅ |
| Comprehensive logging | ✅ |

---

## 🎯 Available Events

### Join Events
```javascript
socket.emit('joinDashboard', { userRole, userId }, callback);
socket.emit('joinServiceQueue', { serviceType }, callback);
socket.emit('joinCounter', { counterId }, callback);
socket.emit('joinUserRoom', { userId }, callback);
socket.emit('leaveRoom', { room }, callback);
```

### Listen Events
```javascript
socket.on('connected', (data) => { /* Client connected */ });
socket.on('staffConnectionUpdate', (data) => { /* Staff changed */ });
socket.on('queueUserJoined', (data) => { /* User joined queue */ });
socket.on('loadBalancingMetrics', (data) => { /* System metrics */ });
```

---

## 💾 Configuration

### Default Settings
```
SOCKET_IO_ORIGIN: http://localhost:5173
Ping interval: 25 seconds
Ping timeout: 20 seconds
Transports: WebSocket + Polling
Reconnection: Enabled
```

### Environment Variable
```env
SOCKET_IO_ORIGIN=http://your-frontend-url
```

---

## 📊 Client Tracking

### Get Connected Count
```javascript
// In controllers/routes
const count = req.app.get('getConnectedClientsCount')();
```

### Get Client Info
```javascript
const clientInfo = req.app.get('getClientInfo')(socketId);
// { id, clientId, connectedAt, rooms, userRole, userId, ... }
```

### Broadcast to All
```javascript
const broadcast = req.app.get('broadcastToAll');
broadcast('eventName', { data });
```

---

## 🔌 Usage in Controllers

```javascript
exports.someAction = (req, res) => {
  const io = req.app.get('io');
  const socketEvents = req.app.get('socketEvents');
  
  // Broadcast to service queue
  io.to('service-Finance').emit('update', { data });
  
  // Notify specific user
  io.to('user-123').emit('notification', { message });
  
  // Use socket events helper
  socketEvents.emitTicketCreated(io, ticket);
};
```

---

## 🧪 Testing

### Browser Console Test
```javascript
// Connect
const socket = io('http://localhost:5000');

// Join dashboard
socket.emit('joinDashboard', { userRole: 'admin', userId: 'test' }, (res) => {
  console.log('Joined:', res);
});

// Listen for updates
socket.on('staffConnectionUpdate', (data) => {
  console.log('Update:', data);
});

// Check connection
socket.emit('ping', (res) => {
  console.log('Pong:', res);
});
```

---

## 📁 File Structure

```
backend/src/
├── index.js                    ✅ Complete (395 lines)
├── utils/
│   ├── socketEvents.js        ✅ Integrated
│   └── loadBalancer.js        ✅ Integrated
├── controllers/
│   └── *.js                   ✅ Can use io context
└── routes/
    └── *.js                   ✅ Can use io context
```

---

## 🔍 Logging

### Connection Logs
```
🟢 Socket connected [1]: abc123 (Total: 1)
📊 [1] Joined dashboard room (Total: 1)
✅ Socket.IO initialized successfully
📊 Load balancing monitor started (broadcasts every 10 seconds)
🔴 Socket disconnected [1]: abc123 | Reason: disconnect | Remaining: 0
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot GET /socket.io/" | Check server is running |
| CORS error | Update `SOCKET_IO_ORIGIN` in .env |
| Connection timeout | Check firewall, WebSocket port |
| Polling fallback | Normal, WebSocket unavailable |
| Reconnection loop | Restart server and client |

---

## 📞 Need Help?

**Documentation:** [SOCKET_IO_SETUP_COMPLETE.md](./SOCKET_IO_SETUP_COMPLETE.md)

**Check:**
1. Server logs for connection messages
2. Browser console for Socket.IO errors
3. Network tab for WebSocket connections
4. Environment variables in .env

---

## ✨ What's Included

✅ Server initialization with all options  
✅ Client connection tracking  
✅ 5 room management events  
✅ Callbacks for all events  
✅ Error handling and recovery  
✅ Load balancer integration  
✅ Utility functions exposed  
✅ Comprehensive logging  
✅ Production-ready configuration  

---

**File:** `backend/src/index.js` (395 lines)  
**Status:** ✅ Complete and Production-Ready  
**Version:** 1.0.0
