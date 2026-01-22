# Load Balancing Implementation - Quick Start Guide

## What's New

A comprehensive real-time counter load balancing system has been added to the KCAU Smart Queue Management System. This system automatically distributes tickets across counters based on queue length, availability, and customer priority.

## Key Features Implemented

✅ **Real-Time Load Metrics** - Calculate load scores for each counter  
✅ **Intelligent Counter Assignment** - Best counter selection when creating tickets  
✅ **Load Balancing Monitor** - Broadcasts metrics every 10 seconds via Socket.io  
✅ **Rebalancing Suggestions** - Recommendations for redistributing tickets  
✅ **Priority-Based Assignment** - High-priority customers get shorter queues  
✅ **Load Balancing Dashboard Component** - Visual display of system metrics  

## Files Added

### Backend
- **[backend/src/utils/loadBalancer.js](backend/src/utils/loadBalancer.js)** - Core load balancing logic
  - `calculateCounterLoadMetrics()` - Calculate load score for a counter
  - `getCountersByLoad()` - Get counters sorted by load
  - `findBestCounterForTicket()` - Find optimal counter for new ticket
  - `suggestLoadRebalancing()` - Suggest ticket redistributions
  - `getLoadBalancingDashboard()` - Get comprehensive metrics
  - `startLoadBalancingMonitor()` - Start real-time metric broadcasting

### Frontend
- **[frontend/src/components/LoadBalancingDashboard.jsx](frontend/src/components/LoadBalancingDashboard.jsx)** - Visual component
  - Real-time metrics display
  - Counter load visualization
  - System health indicators
  - Rebalancing recommendations

## Files Modified

### Backend
1. **[backend/src/controllers/counterController.js](backend/src/controllers/counterController.js)**
   - Added 4 new endpoints for load balancing
   - `getLoadBalancingDashboard()`
   - `getCountersByLoad()`
   - `getBestCounterForTicket()`
   - `getLoadRebalancingSuggestions()`

2. **[backend/src/controllers/ticketController.js](backend/src/controllers/ticketController.js)**
   - Updated `createTicket()` to use load balancing
   - Assigns best counter automatically when creating ticket
   - Includes estimated wait time in response

3. **[backend/src/routes/counterRoutes.js](backend/src/routes/counterRoutes.js)**
   - Added 4 new load balancing routes
   - Routes protected with auth (staff/admin)

4. **[backend/src/utils/socketEvents.js](backend/src/utils/socketEvents.js)**
   - Added `emitLoadMetricsUpdated()` function
   - Broadcasts load metrics to all clients

5. **[backend/src/index.js](backend/src/index.js)**
   - Imported load balancer module
   - Started load monitoring on server startup
   - Monitor broadcasts metrics every 10 seconds

### Frontend
1. **[frontend/src/services/counterService.js](frontend/src/services/counterService.js)**
   - Added 4 new service methods
   - `getLoadBalancingDashboard()`
   - `getCountersByLoad()`
   - `getBestCounterForTicket()`
   - `getLoadRebalancingSuggestions()`

## How It Works

### 1. **Ticket Creation with Load Balancing**

When a customer creates a ticket:

```javascript
const ticket = await createTicket({
  serviceType: 'Finance',
  studentName: 'John Doe',
  email: 'john@example.com',
  userId: customerId // optional
});

// Response includes:
// - ticket (with assigned counter)
// - assignedCounter (load metrics)
// - estimatedWaitTime (in minutes)
```

**Behind the scenes:**
- Load balancer evaluates all available counters
- Selects counter with lowest load score
- For high-priority customers: chooses shortest queue
- Returns estimated wait time

### 2. **Real-Time Monitoring**

Server broadcasts load metrics every 10 seconds:

```javascript
// Automatically received by frontend
socket.on('loadMetricsUpdated', (data) => {
  // Update dashboard with:
  // - Total queue length
  // - Average load score
  // - System load status (low/moderate/high)
  // - Per-counter metrics
  // - Rebalancing suggestions
});
```

### 3. **Staff Dashboard Features**

#### View Counter Load
```
Counter 1: 30% load (1 customer) - Est. wait: 0 min
Counter 2: 65% load (3 customers) - Est. wait: 6 min
Counter 3: 92% load (10 customers) - Est. wait: 27 min ⚠️
```

#### Get Load Recommendations
API: `GET /api/counters/load-balancing/best-counter?serviceType=Finance&priority=normal`

Returns:
```json
{
  "recommendation": {
    "counterName": "Counter 1",
    "loadScore": 30,
    "estimatedWaitTime": 0
  },
  "reason": "Counter has 1 customer(s) in queue with estimated wait time of 0 minutes"
}
```

#### Rebalancing Suggestions
API: `GET /api/counters/load-balancing/suggestions`

Returns recommendations like:
```
Move tickets from Counter 3 (92% load) to Counter 1 (30% load)
```

## Using the Component

### In Admin Dashboard

```jsx
import LoadBalancingDashboard from '../components/LoadBalancingDashboard';

export default function AdminDashboard() {
  return (
    <div>
      {/* ... other components ... */}
      <LoadBalancingDashboard />
    </div>
  );
}
```

### In Staff Dashboard

```jsx
import LoadBalancingDashboard from '../components/LoadBalancingDashboard';

export default function StaffDashboard() {
  return (
    <div>
      <LoadBalancingDashboard />
      {/* ... other staff features ... */}
    </div>
  );
}
```

## Load Score Explanation

**0-30%**: Light load (few or no customers)  
**31-60%**: Moderate load (normal business, acceptable wait)  
**61-80%**: Heavy load (significant queue, longer wait)  
**81-100%**: Overloaded (very long queue or unavailable)

## API Endpoints

### 1. Get Dashboard Metrics
```http
GET /api/counters/load-balancing/dashboard
Authorization: Bearer <token>
```

### 2. Get Counters Sorted by Load
```http
GET /api/counters/load-balancing/by-load?serviceType=Finance
Authorization: Bearer <token>
```

### 3. Get Best Counter Recommendation
```http
GET /api/counters/load-balancing/best-counter?serviceType=Finance&priority=normal
Authorization: Bearer <token>
```

### 4. Get Rebalancing Suggestions
```http
GET /api/counters/load-balancing/suggestions?threshold=70
Authorization: Bearer <token>
```

## Socket.IO Events

### Broadcast (Server → Client)

**Event:** `loadMetricsUpdated`  
**Frequency:** Every 10 seconds  
**Data:** Complete metrics snapshot including:
- System summary (total queue, avg load, health)
- Per-counter metrics
- Rebalancing recommendations

## Testing

### 1. Test Automatic Assignment

```bash
# Create a ticket - should be assigned to least loaded counter
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "Finance",
    "studentName": "Test Student",
    "email": "test@example.com"
  }'
```

Check response for `assignedCounter` and `estimatedWaitTime`.

### 2. Test Dashboard Endpoint

```bash
curl http://localhost:5000/api/counters/load-balancing/dashboard \
  -H "Authorization: Bearer <token>"
```

Should return comprehensive metrics.

### 3. Monitor Real-Time Updates

Open browser console in the frontend and listen:
```javascript
console.log('Listening for load metrics...');
socket.on('loadMetricsUpdated', (data) => {
  console.log('Load updated:', data.summary);
});
```

## Configuration

### Update Monitor Interval

In `backend/src/index.js`, change:
```javascript
startLoadBalancingMonitor(io, 10000); // Currently 10 seconds
// Change to: startLoadBalancingMonitor(io, 5000); // For 5-second updates
```

### Adjust Load Threshold

In `counterController.js`, change default in `getLoadRebalancingSuggestions`:
```javascript
const loadThreshold = threshold ? parseInt(threshold) : 70; // Change 70 to desired value
```

### Modify Average Service Time

In `loadBalancer.js`, change:
```javascript
const avgServiceTimeMinutes = 3; // Change based on actual observations
```

## Integration Checklist

- [x] Backend load balancing logic implemented
- [x] API endpoints created and protected
- [x] Socket.io events emitting metrics
- [x] Ticket creation using load balancing
- [x] Frontend component created
- [x] Frontend services created
- [x] Documentation complete

## Next Steps

1. **Integrate Component in Dashboard**
   - Add to Staff Dashboard for real-time monitoring
   - Add to Admin Dashboard for management view

2. **Monitor Actual Service Times**
   - Collect data on average service times per service type
   - Update calculation if needed

3. **Train Staff**
   - Show staff how to use rebalancing suggestions
   - Teach priority-based assignment logic

4. **Monitor Performance**
   - Track average wait times
   - Measure queue distribution effectiveness
   - Gather feedback from staff

## Troubleshooting

### Metrics Not Updating?
1. Check server logs for "Load balancing metrics updated"
2. Verify Socket.io connection is established
3. Check database connection

### Always Same Counter?
1. Verify multiple counters exist with same service type
2. Check counter availability status
3. Review load score calculation in logs

### High Wait Times?
1. Check average service time assumption
2. Consider opening more counters during peak hours
3. Review priority-based routing

## Support Resources

- **Full Documentation:** [LOAD_BALANCING_GUIDE.md](LOAD_BALANCING_GUIDE.md)
- **Backend Logic:** [backend/src/utils/loadBalancer.js](backend/src/utils/loadBalancer.js)
- **Counter Controller:** [backend/src/controllers/counterController.js](backend/src/controllers/counterController.js)
- **Counter Routes:** [backend/src/routes/counterRoutes.js](backend/src/routes/counterRoutes.js)

---

**Status:** ✅ Ready for use  
**Last Updated:** January 20, 2026
