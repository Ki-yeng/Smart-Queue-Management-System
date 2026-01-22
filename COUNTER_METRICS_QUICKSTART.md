# Counter Metrics - Quick Reference

## What Was Built

A complete **counter performance metrics system** that automatically tracks:
- ✅ Tickets served per counter
- ✅ Average service time (in seconds & minutes)
- ✅ Min/max service times
- ✅ Metrics by service type
- ✅ Daily metrics with history
- ✅ Performance comparisons

---

## 🚀 Quick Start

### Use the Metrics Immediately

No setup needed! Metrics start tracking automatically when:

```
1. Ticket is created
2. Ticket is served at counter
3. Staff marks ticket as complete ← METRICS UPDATE HERE
4. Metrics available via API
```

### Get Metrics via API

```bash
# Get single counter metrics
curl http://localhost:5000/api/counters/metrics/{counterId} \
  -H "Authorization: Bearer {token}"

# Get all counters metrics
curl http://localhost:5000/api/counters/metrics/all \
  -H "Authorization: Bearer {token}"

# Compare counters
curl http://localhost:5000/api/counters/metrics/comparison \
  -H "Authorization: Bearer {token}"

# Get dashboard summary
curl http://localhost:5000/api/counters/metrics/summary \
  -H "Authorization: Bearer {token}"
```

---

## 📊 What Each Metric Means

| Metric | Meaning | Example |
|--------|---------|---------|
| totalTicketsServed | Total completed tickets | 245 customers |
| avgServiceTime | Average time per ticket | 180 seconds = 3 minutes |
| minServiceTime | Fastest service | 45 seconds |
| maxServiceTime | Slowest service | 720 seconds = 12 minutes |
| ticketsCompletedToday | Tickets served today | 12 (resets daily) |

---

## 📈 Sample Metrics Response

```json
{
  "totalTicketsServed": 245,
  "avgServiceTime": 180,
  "avgServiceTimeMinutes": "3.00",
  "ticketsCompletedToday": 12,
  "serviceTypeMetrics": [
    {
      "serviceType": "Finance",
      "ticketsServed": 245,
      "avgServiceTime": 180
    }
  ]
}
```

---

## 🔗 API Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/counters/metrics/:id` | Get 1 counter's metrics | Staff/Admin |
| `GET /api/counters/metrics/all` | Get all metrics | Staff/Admin |
| `GET /api/counters/metrics/comparison` | Compare counters | Staff/Admin |
| `GET /api/counters/metrics/summary` | Dashboard summary | Staff/Admin |

---

## 💻 Code Examples

### React Component
```jsx
import { useEffect, useState } from 'react';

export default function CounterMetrics() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch('/api/counters/metrics/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => setMetrics(data.metrics));
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div>
      <p>Tickets Today: {metrics.ticketsServedToday}</p>
      <p>Avg Time: {metrics.avgServiceTimeMinutes} min</p>
    </div>
  );
}
```

### JavaScript
```javascript
async function getMetrics(counterId) {
  const res = await fetch(`/api/counters/metrics/${counterId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  console.log(`Counter: ${data.metrics.counterName}`);
  console.log(`Served: ${data.metrics.performance.totalTicketsServed}`);
  console.log(`Avg Time: ${data.metrics.performance.avgServiceTimeMinutes} min`);
}
```

---

## 📂 Files Changed

### New Files (2)
- `backend/src/utils/metricsCalculator.js` - Core metrics logic
- `COUNTER_METRICS_API.md` - Full API documentation

### Updated Files (4)
- `backend/src/models/Counter.js` - Added metrics fields
- `backend/src/controllers/ticketController.js` - Calls metrics on completion
- `backend/src/controllers/counterController.js` - Added 4 endpoints
- `backend/src/routes/counterRoutes.js` - Added 4 routes

---

## ⚙️ How It Works

```
Ticket Completed
    ↓
Calculate serviceTime = completedAt - servedAt
    ↓
Update Counter Metrics:
  - totalTicketsServed += 1
  - totalServiceTime += serviceTime
  - avgServiceTime = totalServiceTime / totalTicketsServed
  - Update min/max
    ↓
Update Service Type Metrics
    ↓
Update Daily Count
    ↓
Save & Available via API
```

---

## 🎯 Performance Benchmarks

**Service Time Ratings:**
- ⚡ < 2 minutes: Excellent
- ✅ 2-3 minutes: Good
- ⚠️ 3-4 minutes: Fair
- ❌ > 4 minutes: Slow

---

## 🔐 Security

✅ All endpoints require authentication  
✅ Staff/Admin roles only  
✅ No sensitive data exposed  

---

## 📊 Useful Queries

### Get Most Productive Counter
```javascript
const comparison = await getCounterPerformanceComparison();
const best = comparison.topPerformers.mostProductive;
// Counter with most tickets served
```

### Get Most Efficient Counter
```javascript
const comparison = await getCounterPerformanceComparison();
const fastest = comparison.topPerformers.mostEfficient;
// Counter with shortest average service time
```

### Get Daily Summary
```javascript
const summary = await getMetricsDashboardSummary();
console.log(`Tickets today: ${summary.metrics.ticketsServedToday}`);
console.log(`System average: ${summary.metrics.avgServiceTimeMinutes} min`);
```

---

## 📚 Full Documentation

- **Complete API Reference:** `COUNTER_METRICS_API.md`
- **Implementation Details:** `COUNTER_METRICS_IMPLEMENTATION.md`
- **Core Logic:** `backend/src/utils/metricsCalculator.js`

---

## ✨ Key Features

- 🤖 Automatic tracking (no manual input)
- 📊 Real-time metrics updates
- 📈 Historical data (90 days)
- 🔍 By service type tracking
- 🏆 Performance ranking
- 📱 API endpoints ready
- 🔐 Secure & authenticated
- ⚡ Efficient queries

---

## 🎉 Ready to Use

Everything is implemented, tested, and ready:
- ✅ Metrics tracking active
- ✅ API endpoints live
- ✅ Database fields added
- ✅ Integration complete
- ✅ Documentation included

Start using metrics immediately - they track automatically!

---

**Status:** ✅ COMPLETE AND READY FOR USE
