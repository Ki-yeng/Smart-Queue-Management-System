# KPI Testing Guide

## Testing the KPI Implementation

Complete testing guide for the KPI endpoints and calculations.

---

## 📋 Pre-Testing Checklist

- [ ] Backend server running (`npm start`)
- [ ] MongoDB connected
- [ ] Test data exists in Ticket collection
- [ ] Valid JWT token available
- [ ] Postman or curl installed

---

## 🧪 Test Suite 1: Authentication & Authorization

### Test 1.1: Missing Token
**Endpoint**: `GET /api/dashboard/kpis`
**Expected**: 401 Unauthorized

```bash
curl -X GET http://localhost:3000/api/dashboard/kpis
```

**Expected Response**:
```json
{
  "message": "Authentication required",
  "error": "Missing or invalid token"
}
```

### Test 1.2: Invalid Token
```bash
curl -H "Authorization: Bearer INVALID_TOKEN" \
  http://localhost:3000/api/dashboard/kpis
```

**Expected**: 401 Unauthorized

### Test 1.3: Valid Token - Staff Access
```bash
curl -H "Authorization: Bearer VALID_JWT_TOKEN" \
  http://localhost:3000/api/dashboard/kpis
```

**Expected**: 200 OK with KPI data

### Test 1.4: Insufficient Permissions
Use a customer JWT token with `/api/dashboard/kpis`

**Expected**: 403 Forbidden

---

## 🧪 Test Suite 2: Wait Time Metrics

### Test 2.1: Basic Wait Time Query
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time"
```

**Verify Response Contains**:
- ✅ `summary.avgWaitTime` (number)
- ✅ `summary.medianWaitTime` (number)
- ✅ `summary.p95WaitTime` (number)
- ✅ `summary.p99WaitTime` (number)
- ✅ `summary.totalTickets` (number > 0)
- ✅ `byService` (array)
- ✅ `byPriority` (array)

### Test 2.2: Wait Time with Service Filter
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?serviceType=registration"
```

**Verify**:
- ✅ Only "registration" service in `byService`
- ✅ All metrics present
- ✅ Response time < 1 second

### Test 2.3: Wait Time with Date Range
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?startDate=2024-12-01&endDate=2024-12-31"
```

**Verify**:
- ✅ Data within date range
- ✅ Metrics calculated correctly
- ✅ No future dates included

### Test 2.4: Wait Time with Priority Filter
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?priority=urgent"
```

**Verify**:
- ✅ Mostly "urgent" priority tickets
- ✅ Lower average wait time than overall
- ✅ Accurate count

### Test 2.5: Percentile Calculations
With Test 2.1 response, verify:
- ✅ `medianWaitTime` ≥ `minWaitTime`
- ✅ `p95WaitTime` ≥ `medianWaitTime`
- ✅ `p99WaitTime` ≥ `p95WaitTime`
- ✅ `maxWaitTime` ≥ `p99WaitTime`

---

## 🧪 Test Suite 3: Service Time Metrics

### Test 3.1: Basic Service Time Query
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/service-time"
```

**Verify Response Contains**:
- ✅ `summary.avgServiceTime` (number)
- ✅ `summary.medianServiceTime` (number)
- ✅ `summary.p95ServiceTime` (number)
- ✅ `summary.p99ServiceTime` (number)
- ✅ `byService` breakdown
- ✅ `byPriority` breakdown

### Test 3.2: Service Time Comparison
Compare with Test 2.1:
- Service time should be less than wait time
- All other filter tests should work similarly

### Test 3.3: By Priority Analysis
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/service-time?priority=vip"
```

**Verify**:
- ✅ VIP service times < normal service times
- ✅ Accurate breakdown

---

## 🧪 Test Suite 4: Throughput Metrics

### Test 4.1: Daily Throughput
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=daily"
```

**Verify Response Contains**:
- ✅ `summary.totalTicketsProcessed` (number)
- ✅ `summary.avgThroughput` (number)
- ✅ `summary.maxThroughput` (number)
- ✅ `summary.minThroughput` (number)
- ✅ `peakPeriod` with highest throughput
- ✅ `lowPeriod` with lowest throughput
- ✅ `byPeriod` array with daily breakdown

### Test 4.2: Throughput Calculation Verification
For Test 4.1 response:
- ✅ `avgThroughput` = `totalTicketsProcessed` / count of periods
- ✅ All daily values in `byPeriod` ≤ `maxThroughput`
- ✅ All daily values ≥ `minThroughput`

### Test 4.3: Different Granularities
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=hourly"
```

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=weekly"
```

**Verify**:
- ✅ Hourly has more periods than daily
- ✅ Weekly has fewer periods than daily
- ✅ Total tickets same across granularities

### Test 4.4: Throughput Over Time
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?startDate=2024-11-01&endDate=2024-12-31"
```

**Verify**:
- ✅ Data spans requested period
- ✅ Peaks and low periods identified
- ✅ Accurate calculations

---

## 🧪 Test Suite 5: SLA Compliance

### Test 5.1: Default SLA Targets
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/sla"
```

**Verify Response Contains**:
- ✅ `slaTargets.maxWaitTime` = 10 (default)
- ✅ `slaTargets.maxServiceTime` = 15 (default)
- ✅ `overall.totalTickets` (number > 0)
- ✅ `overall.waitTimeCompliance.rate` (percentage string)
- ✅ `overall.serviceTimeCompliance.rate` (percentage string)
- ✅ `overall.overallCompliance.rate` (percentage string)

### Test 5.2: Custom SLA Targets
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/sla?maxWaitTime=8&maxServiceTime=12"
```

**Verify**:
- ✅ `slaTargets` updated to new values
- ✅ Compliance rates recalculated (usually lower)
- ✅ More tickets marked as non-compliant

### Test 5.3: Compliance Rate Calculation
For Test 5.1 response:
- ✅ `waitTimeCompliance.rate` = (compliant / total) × 100
- ✅ `overall.overallCompliance.rate` = compliant tickets meeting BOTH criteria / total
- ✅ Rates between 0% and 100%

### Test 5.4: By Service Breakdown
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/sla?serviceType=registration"
```

**Verify**:
- ✅ Only "registration" in response
- ✅ Has own compliance percentages
- ✅ Rates may differ from overall

### Test 5.5: Compliance by Service Comparison
Compare SLA response for different services:
- Some services should have better compliance than others
- High-complexity services may have lower compliance

---

## 🧪 Test Suite 6: Health Score

### Test 6.1: Health Score Structure
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis"
```

From comprehensive KPI response, verify `healthScore`:
- ✅ `score` (number 0-100)
- ✅ `status` (one of: Excellent, Good, Fair, Poor)
- ✅ `color` (one of: green, yellow, orange, red)

### Test 6.2: Health Score Ranges
Check multiple systems or time periods:
- ✅ Score 90-100 → status "Excellent" → color "green"
- ✅ Score 75-89 → status "Good" → color "yellow"
- ✅ Score 60-74 → status "Fair" → color "orange"
- ✅ Score 0-59 → status "Poor" → color "red"

### Test 6.3: Health Score Calculation
For comprehensive KPI response, verify health score is affected by:
- ✅ High wait times → lower score
- ✅ High service times → lower score
- ✅ Low SLA compliance → lower score

---

## 🧪 Test Suite 7: Trends

### Test 7.1: 7-Day Trends (Default)
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends"
```

**Verify Response Contains**:
- ✅ `period.days` = 7
- ✅ `dailyTrends` (array with 7 entries)
- ✅ Each entry has: date, avgWaitTime, avgServiceTime, ticketsProcessed
- ✅ `trendAnalysis.overallTrend` (improving/declining/stable)

### Test 7.2: Different Trend Periods
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=14"
```

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=30"
```

**Verify**:
- ✅ 14 days → 14 entries
- ✅ 30 days → 30 entries
- ✅ Dates are unique and sequential

### Test 7.3: Trend Direction Calculation
From 7-day trends response, verify trend logic:
- ✅ If recent metrics better than older → "improving"
- ✅ If recent metrics worse than older → "declining"
- ✅ If relatively same → "stable"

### Test 7.4: Trend Service Filtering
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=7&serviceType=payment"
```

**Verify**:
- ✅ Trends for payment service only
- ✅ Different values than overall trends
- ✅ May have different trend direction

---

## 🧪 Test Suite 8: Date Parameter Validation

### Test 8.1: Valid Date Formats
```bash
# Valid: YYYY-MM-DD
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?startDate=2024-12-01&endDate=2024-12-31"
```

**Expected**: 200 OK

### Test 8.2: Invalid Date Format
```bash
# Invalid: MM/DD/YYYY
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?startDate=12/01/2024"
```

**Expected**: 400 Bad Request with error message

### Test 8.3: Future Dates
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?startDate=2025-01-01"
```

**Expected**: 200 OK (empty or no data for future dates)

### Test 8.4: Inverted Date Range
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?startDate=2024-12-31&endDate=2024-12-01"
```

**Expected**: 400 Bad Request or 200 OK with empty data

---

## 🧪 Test Suite 9: Response Performance

### Test 9.1: Response Time - Comprehensive
```bash
time curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis"
```

**Expected**: < 1200ms (ideally < 1000ms)

### Test 9.2: Response Time - Specific Metrics
```bash
time curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time"
```

**Expected**: < 500ms (ideally < 400ms)

### Test 9.3: Response Time - With Filters
```bash
time curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?serviceType=registration&startDate=2024-12-01"
```

**Expected**: Faster than without filters

### Test 9.4: Concurrent Requests
```bash
# Send 10 concurrent requests
for i in {1..10}; do
  curl -H "Authorization: Bearer TOKEN" \
    "http://localhost:3000/api/dashboard/kpis" &
done
wait
```

**Expected**: All complete without timeout or errors

---

## 🧪 Test Suite 10: Data Accuracy

### Test 10.1: Wait Time Calculation
Manually verify for a sample ticket:
```javascript
// From database
ticketA: { createdAt: "2024-12-17T10:00:00Z", servedAt: "2024-12-17T10:05:00Z" }
// Expected wait time: 5 minutes
// Verify in response: avgWaitTime includes this

// Calculation: (10:05 - 10:00) / 60000 = 5 minutes ✅
```

### Test 10.2: Service Time Calculation
```javascript
// From database
ticketA: { servedAt: "2024-12-17T10:05:00Z", completedAt: "2024-12-17T10:10:00Z" }
// Expected service time: 5 minutes
// Verification: (10:10 - 10:05) / 60000 = 5 minutes ✅
```

### Test 10.3: Ticket Count Consistency
Compare metrics across endpoints:
```bash
# Wait time endpoint shows totalTickets: 2850
# Service time endpoint shows totalTickets: 2850
# Throughput shows totalTicketsProcessed: 2850
# SLA shows totalTickets: 2850
```

**Expected**: All show same total

### Test 10.4: Breakdown Sum Verification
For wait time by service:
```
registration: 850 tickets
payment: 920 tickets
document: 1080 tickets
Total: 2850 ✅
```

---

## 🧪 Test Suite 11: Error Handling

### Test 11.1: Invalid Service Type
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?serviceType=INVALID"
```

**Expected**: 200 OK with empty/no data or error message

### Test 11.2: Invalid Priority
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?priority=invalid"
```

**Expected**: 400 Bad Request or 200 OK with filtered results

### Test 11.3: Invalid Granularity
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=monthly"
```

**Expected**: 400 Bad Request with error message

### Test 11.4: Negative Days
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=-7"
```

**Expected**: 400 Bad Request

### Test 11.5: Days Out of Range
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=999"
```

**Expected**: 400 Bad Request or capped at max value

---

## 📊 Manual Testing Checklist

### Setup
- [ ] Start backend server
- [ ] Verify MongoDB connection
- [ ] Generate valid JWT token
- [ ] Have Postman/curl ready

### Test All 6 Endpoints
- [ ] `GET /api/dashboard/kpis` - Comprehensive
- [ ] `GET /api/dashboard/kpis/wait-time` - Wait times
- [ ] `GET /api/dashboard/kpis/service-time` - Service times
- [ ] `GET /api/dashboard/kpis/throughput` - Throughput
- [ ] `GET /api/dashboard/kpis/sla` - SLA compliance
- [ ] `GET /api/dashboard/kpis/trends` - Trends

### Test Each With Filters
- [ ] Date range (startDate, endDate)
- [ ] Service type filter
- [ ] Priority filter
- [ ] Granularity (for throughput)
- [ ] Custom SLA targets
- [ ] Days (for trends)

### Verify Data Accuracy
- [ ] Percentiles in correct order
- [ ] Totals add up correctly
- [ ] Times reasonable (not negative)
- [ ] Percentages between 0-100

### Check Response Quality
- [ ] No errors in response
- [ ] Proper JSON format
- [ ] All expected fields present
- [ ] No null/undefined values (except optional)

---

## Automated Testing (Jest Example)

```javascript
describe('KPI Endpoints', () => {
  let token;
  
  beforeAll(async () => {
    token = await generateTestJWT();
  });

  describe('GET /api/dashboard/kpis', () => {
    it('should return comprehensive KPI metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('waitTimeMetrics');
      expect(res.body.data).toHaveProperty('serviceTimeMetrics');
      expect(res.body.data).toHaveProperty('throughputMetrics');
      expect(res.body.data).toHaveProperty('slaCompliance');
      expect(res.body.data).toHaveProperty('healthScore');
    });
  });

  describe('GET /api/dashboard/kpis/wait-time', () => {
    it('should calculate wait times correctly', async () => {
      const res = await request(app)
        .get('/api/dashboard/kpis/wait-time')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      const { summary } = res.body.data;
      expect(summary.minWaitTime).toBeLessThanOrEqual(summary.medianWaitTime);
      expect(summary.medianWaitTime).toBeLessThanOrEqual(summary.p95WaitTime);
      expect(summary.p95WaitTime).toBeLessThanOrEqual(summary.p99WaitTime);
      expect(summary.p99WaitTime).toBeLessThanOrEqual(summary.maxWaitTime);
    });
  });

  // ... More tests
});
```

---

## 🐛 Troubleshooting

### Issue: Empty Results
**Solution**: 
- Check if data exists in database for date range
- Verify tickets have required fields (createdAt, servedAt, completedAt)

### Issue: Slow Response
**Solution**:
- Add date range filter
- Add serviceType filter
- Create recommended database indexes

### Issue: Incorrect Calculations
**Solution**:
- Check ticket timestamps are correct
- Verify date formats (YYYY-MM-DD)
- Ensure tickets have all required status values

### Issue: Permission Denied
**Solution**:
- Verify JWT token is valid
- Check user role is Staff/Admin/Manager
- Ensure Authorization header format is correct

---

## ✅ Sign-Off

After completing all tests above, you can confirm:
- ✅ All endpoints working correctly
- ✅ Calculations accurate
- ✅ Performance acceptable
- ✅ Error handling robust
- ✅ Security verified
- ✅ Data integrity confirmed

---

**Testing Completed**: [Date/Time]  
**Tested By**: [Name]  
**Status**: ✅ Ready for Production
