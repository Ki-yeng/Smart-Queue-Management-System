# KPI Quick Reference

## API Endpoints at a Glance

| Endpoint | Method | Purpose | Query Params |
|----------|--------|---------|--------------|
| `/api/dashboard/kpis` | GET | Comprehensive KPI report | startDate, endDate, serviceType |
| `/api/dashboard/kpis/wait-time` | GET | Wait time analysis | startDate, endDate, serviceType, priority |
| `/api/dashboard/kpis/service-time` | GET | Service time analysis | startDate, endDate, serviceType, priority |
| `/api/dashboard/kpis/throughput` | GET | Throughput metrics | startDate, endDate, serviceType, granularity |
| `/api/dashboard/kpis/sla` | GET | SLA compliance | startDate, endDate, maxWaitTime, maxServiceTime, serviceType |
| `/api/dashboard/kpis/trends` | GET | KPI trends | days, serviceType |

---

## Key Metrics Explained

### Wait Time
**What**: Time from ticket creation to service start  
**Unit**: Minutes  
**Calculation**: `(servedAt - createdAt) / 60000`  
**Health**: Lower is better (target < 10 min)  
**Key Values**: Average, Median, P95, P99

### Service Time
**What**: Time from service start to completion  
**Unit**: Minutes  
**Calculation**: `(completedAt - servedAt) / 60000`  
**Health**: Lower is better (target < 15 min)  
**Key Values**: Average, Median, P95, P99

### Throughput
**What**: Tickets processed per unit time  
**Unit**: Tickets/period  
**Calculation**: `Total Tickets / Number of Periods`  
**Health**: Higher is better  
**Key Values**: Total, Average, Peak, Low

### SLA Compliance
**What**: Percentage meeting Service Level Agreement  
**Unit**: Percentage  
**Calculation**: `(Compliant / Total) × 100`  
**Health**: Higher is better (target > 95%)  
**Key Values**: Overall %, By Service, By Priority

### Health Score
**What**: Overall system health assessment  
**Range**: 0-100  
**Status**: Green (90+), Yellow (75-89), Orange (60-74), Red (<60)  
**Calculation**: 100 - penalties based on metrics

---

## Common Queries

### Get Last 7 Days KPIs
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis"
```

### Get Wait Time for Specific Service
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?serviceType=registration"
```

### Get SLA with Custom Targets
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/sla?maxWaitTime=8&maxServiceTime=12"
```

### Get Daily Throughput
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=daily"
```

### Get 14-Day Trends
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=14"
```

### Get Date Range KPIs
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?startDate=2024-12-01&endDate=2024-12-31"
```

---

## Query Parameters Reference

### startDate / endDate
- **Format**: YYYY-MM-DD
- **Example**: `2024-12-17`
- **Default**: Last 7 days if not specified

### serviceType
- **Valid Values**: As per your system (registration, payment, etc.)
- **Example**: `registration`
- **Default**: All services if not specified

### priority
- **Valid Values**: normal, high, urgent, vip
- **Example**: `urgent`
- **Default**: All priorities if not specified

### granularity
- **Valid Values**: hourly, daily, weekly
- **Example**: `daily`
- **Default**: daily

### days
- **Valid Values**: 1-365
- **Example**: `14`
- **Default**: 7

### maxWaitTime / maxServiceTime
- **Valid Values**: Any positive number (minutes)
- **Examples**: maxWaitTime=10, maxServiceTime=15
- **Defaults**: 10 min wait, 15 min service

---

## Response Structure

### Summary Metrics
```json
{
  "avgWaitTime": 8.5,
  "medianWaitTime": 7.0,
  "minWaitTime": 0.5,
  "maxWaitTime": 45.2,
  "p95WaitTime": 25.3,
  "p99WaitTime": 38.1,
  "totalTickets": 2850
}
```

### By Service Breakdown
```json
[
  {
    "serviceType": "registration",
    "avgWaitTime": 9.2,
    "medianWaitTime": 8.0,
    "count": 850
  }
]
```

### Health Score
```json
{
  "score": 87,
  "status": "Good",
  "color": "yellow"
}
```

---

## Health Score Interpretation

| Score | Status | Color | Action |
|-------|--------|-------|--------|
| 90-100 | Excellent | Green | ✅ All systems optimal |
| 75-89 | Good | Yellow | ⚠️ Monitor performance |
| 60-74 | Fair | Orange | ⚠️ Investigate issues |
| 0-59 | Poor | Red | 🔴 Immediate action needed |

---

## Authentication

All endpoints require JWT bearer token:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

**Required Roles**: Staff, Admin, or Manager

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid query parameters |
| 401 | Missing/invalid authentication |
| 403 | Insufficient permissions |
| 404 | Endpoint not found |
| 500 | Server error |

---

## JavaScript/Node.js Examples

### Fetch Comprehensive KPIs
```javascript
const axios = require('axios');

async function getKPIs() {
  try {
    const { data } = await axios.get(
      'http://localhost:3000/api/dashboard/kpis',
      {
        headers: {
          Authorization: `Bearer ${process.env.JWT_TOKEN}`
        }
      }
    );
    console.log('Health Score:', data.data.healthScore);
    console.log('Avg Wait Time:', data.data.waitTimeMetrics.summary.avgWaitTime);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getKPIs();
```

### Fetch With Filters
```javascript
async function getFilteredKPIs() {
  const params = {
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    serviceType: 'registration'
  };

  const { data } = await axios.get(
    'http://localhost:3000/api/dashboard/kpis/wait-time',
    {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return data.data;
}
```

---

## React Hook Example

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function useKPIs(filters = {}) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const { data } = await axios.get(
          'http://localhost:3000/api/dashboard/kpis',
          { params: filters }
        );
        setKpis(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [JSON.stringify(filters)]);

  return { kpis, loading, error };
}

// Usage
function KPIDashboard() {
  const { kpis, loading } = useKPIs({ days: 7 });

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>System Health: {kpis.healthScore.score}/100</h1>
      <p>Avg Wait Time: {kpis.waitTimeMetrics.summary.avgWaitTime} min</p>
    </div>
  );
}
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution**: Check JWT token is valid and passed in Authorization header

### Issue: Empty Results
**Solution**: Ensure date range includes data; check if tickets exist in database

### Issue: Slow Responses
**Solution**: Add specific filters (date range, serviceType); avoid unlimited date ranges

### Issue: Missing Percentiles
**Solution**: Ensure there are enough tickets in the dataset (need min 100 for accurate p95, p99)

---

## Performance Tips

1. **Always specify date ranges** - Speeds up queries significantly
2. **Use serviceType filter** - Reduces data processing
3. **Cache results** - Reuse data when possible
4. **Batch queries** - Combine multiple requests when needed
5. **Use appropriate granularity** - Daily is faster than hourly

---

## Database Indexes

For optimal performance, ensure these indexes exist:

```javascript
// In MongoDB
db.tickets.createIndex({ "status": 1, "completedAt": -1 });
db.tickets.createIndex({ "serviceType": 1, "completedAt": -1 });
db.tickets.createIndex({ "priority": 1, "completedAt": -1 });
db.tickets.createIndex({ "createdAt": 1, "servedAt": 1 });
```

---

## Additional Resources

- Full implementation guide: `KPI_CALCULATIONS_GUIDE.md`
- KPI calculator code: `backend/src/utils/kpiCalculator.js`
- Controller functions: `backend/src/controllers/dashboardController.js`
- Routes: `backend/src/routes/dashboardRoutes.js`

---

**Quick Start**: Use the examples above, adjust parameters as needed, and refer to the full guide for details.
