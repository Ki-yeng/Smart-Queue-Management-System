# KPI API Response Examples

## 1. Comprehensive KPI Report
**Endpoint**: `GET /api/dashboard/kpis`

### Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis?days=7"
```

### Response
```json
{
  "message": "KPI metrics retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "dateRange": {
      "start": "2024-12-10",
      "end": "2024-12-17"
    },
    "waitTimeMetrics": {
      "summary": {
        "avgWaitTime": 8.5,
        "minWaitTime": 0.5,
        "maxWaitTime": 45.2,
        "medianWaitTime": 7.0,
        "p95WaitTime": 25.3,
        "p99WaitTime": 38.1,
        "totalTickets": 2850
      },
      "byService": [
        {
          "serviceType": "registration",
          "avgWaitTime": 9.2,
          "medianWaitTime": 8.1,
          "p95WaitTime": 27.5,
          "count": 850
        },
        {
          "serviceType": "payment",
          "avgWaitTime": 7.8,
          "medianWaitTime": 6.5,
          "p95WaitTime": 22.1,
          "count": 920
        },
        {
          "serviceType": "document_collection",
          "avgWaitTime": 8.9,
          "medianWaitTime": 7.8,
          "p95WaitTime": 25.9,
          "count": 1080
        }
      ],
      "byPriority": [
        {
          "priority": "vip",
          "avgWaitTime": 1.2,
          "count": 50
        },
        {
          "priority": "urgent",
          "avgWaitTime": 2.8,
          "count": 200
        },
        {
          "priority": "high",
          "avgWaitTime": 5.5,
          "count": 600
        },
        {
          "priority": "normal",
          "avgWaitTime": 10.2,
          "count": 2000
        }
      ]
    },
    "serviceTimeMetrics": {
      "summary": {
        "avgServiceTime": 5.2,
        "minServiceTime": 1.0,
        "maxServiceTime": 28.5,
        "medianServiceTime": 4.8,
        "p95ServiceTime": 15.3,
        "p99ServiceTime": 22.1,
        "totalTickets": 2850
      },
      "byService": [
        {
          "serviceType": "registration",
          "avgServiceTime": 6.5,
          "medianServiceTime": 6.0,
          "p95ServiceTime": 18.2,
          "count": 850
        },
        {
          "serviceType": "payment",
          "avgServiceTime": 4.2,
          "medianServiceTime": 3.8,
          "p95ServiceTime": 12.5,
          "count": 920
        },
        {
          "serviceType": "document_collection",
          "avgServiceTime": 5.1,
          "medianServiceTime": 4.6,
          "p95ServiceTime": 14.8,
          "count": 1080
        }
      ],
      "byPriority": [
        {
          "priority": "vip",
          "avgServiceTime": 3.1,
          "count": 50
        },
        {
          "priority": "urgent",
          "avgServiceTime": 4.2,
          "count": 200
        },
        {
          "priority": "high",
          "avgServiceTime": 5.0,
          "count": 600
        },
        {
          "priority": "normal",
          "avgServiceTime": 5.5,
          "count": 2000
        }
      ]
    },
    "throughputMetrics": {
      "summary": {
        "totalTicketsProcessed": 2850,
        "avgThroughput": 407.14,
        "maxThroughput": 520,
        "minThroughput": 285,
        "stdDeviation": 89.5
      },
      "peakPeriod": {
        "period": {
          "date": "2024-12-15"
        },
        "ticketsProcessed": 520,
        "avgServiceTime": 5.1
      },
      "lowPeriod": {
        "period": {
          "date": "2024-12-11"
        },
        "ticketsProcessed": 285,
        "avgServiceTime": 5.5
      },
      "byPeriod": [
        {
          "period": {
            "date": "2024-12-17"
          },
          "ticketsProcessed": 415,
          "avgServiceTime": 5.3
        },
        {
          "period": {
            "date": "2024-12-16"
          },
          "ticketsProcessed": 465,
          "avgServiceTime": 5.1
        },
        {
          "period": {
            "date": "2024-12-15"
          },
          "ticketsProcessed": 520,
          "avgServiceTime": 5.0
        },
        {
          "period": {
            "date": "2024-12-14"
          },
          "ticketsProcessed": 395,
          "avgServiceTime": 5.4
        },
        {
          "period": {
            "date": "2024-12-13"
          },
          "ticketsProcessed": 420,
          "avgServiceTime": 5.2
        },
        {
          "period": {
            "date": "2024-12-12"
          },
          "ticketsProcessed": 350,
          "avgServiceTime": 5.6
        },
        {
          "period": {
            "date": "2024-12-11"
          },
          "ticketsProcessed": 285,
          "avgServiceTime": 5.8
        }
      ]
    },
    "slaCompliance": {
      "slaTargets": {
        "maxWaitTime": 10,
        "maxServiceTime": 15
      },
      "overall": {
        "totalTickets": 2850,
        "waitTimeCompliance": {
          "compliant": 2556,
          "noncompliant": 294,
          "rate": "89.7%"
        },
        "serviceTimeCompliance": {
          "compliant": 2698,
          "noncompliant": 152,
          "rate": "94.7%"
        },
        "overallCompliance": {
          "compliant": 2500,
          "noncompliant": 350,
          "rate": "87.7%"
        }
      },
      "byService": [
        {
          "serviceType": "registration",
          "totalTickets": 850,
          "waitTimeComplianceRate": 92,
          "serviceTimeComplianceRate": 96,
          "overallComplianceRate": 90
        },
        {
          "serviceType": "payment",
          "totalTickets": 920,
          "waitTimeComplianceRate": 89,
          "serviceTimeComplianceRate": 97,
          "overallComplianceRate": 88
        },
        {
          "serviceType": "document_collection",
          "totalTickets": 1080,
          "waitTimeComplianceRate": 88,
          "serviceTimeComplianceRate": 92,
          "overallComplianceRate": 85
        }
      ]
    },
    "healthScore": {
      "score": 87,
      "status": "Good",
      "color": "yellow",
      "breakdown": {
        "waitTimeImpact": -8,
        "serviceTimeImpact": -3,
        "slaComplianceImpact": -2
      }
    }
  }
}
```

---

## 2. Wait Time KPIs
**Endpoint**: `GET /api/dashboard/kpis/wait-time`

### Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/wait-time?serviceType=registration"
```

### Response
```json
{
  "message": "Wait time metrics retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "summary": {
      "avgWaitTime": 9.2,
      "minWaitTime": 0.3,
      "maxWaitTime": 42.1,
      "medianWaitTime": 8.1,
      "p95WaitTime": 27.5,
      "p99WaitTime": 35.8,
      "totalTickets": 850
    },
    "byService": [
      {
        "serviceType": "registration",
        "avgWaitTime": 9.2,
        "minWaitTime": 0.3,
        "maxWaitTime": 42.1,
        "medianWaitTime": 8.1,
        "p95WaitTime": 27.5,
        "p99WaitTime": 35.8,
        "count": 850
      }
    ],
    "byPriority": [
      {
        "priority": "vip",
        "avgWaitTime": 0.8,
        "count": 10
      },
      {
        "priority": "urgent",
        "avgWaitTime": 2.1,
        "count": 45
      },
      {
        "priority": "high",
        "avgWaitTime": 5.2,
        "count": 150
      },
      {
        "priority": "normal",
        "avgWaitTime": 11.5,
        "count": 645
      }
    ]
  }
}
```

---

## 3. Service Time KPIs
**Endpoint**: `GET /api/dashboard/kpis/service-time`

### Response
```json
{
  "message": "Service time metrics retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "summary": {
      "avgServiceTime": 5.2,
      "minServiceTime": 1.0,
      "maxServiceTime": 28.5,
      "medianServiceTime": 4.8,
      "p95ServiceTime": 15.3,
      "p99ServiceTime": 22.1,
      "totalTickets": 2850
    },
    "byService": [
      {
        "serviceType": "registration",
        "avgServiceTime": 6.5,
        "medianServiceTime": 6.0,
        "p95ServiceTime": 18.2,
        "count": 850
      },
      {
        "serviceType": "payment",
        "avgServiceTime": 4.2,
        "medianServiceTime": 3.8,
        "p95ServiceTime": 12.5,
        "count": 920
      }
    ],
    "byPriority": [
      {
        "priority": "vip",
        "avgServiceTime": 3.1,
        "count": 50
      },
      {
        "priority": "urgent",
        "avgServiceTime": 4.2,
        "count": 200
      },
      {
        "priority": "high",
        "avgServiceTime": 5.0,
        "count": 600
      },
      {
        "priority": "normal",
        "avgServiceTime": 5.5,
        "count": 2000
      }
    ]
  }
}
```

---

## 4. Throughput KPIs
**Endpoint**: `GET /api/dashboard/kpis/throughput`

### Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/throughput?granularity=daily"
```

### Response
```json
{
  "message": "Throughput metrics retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "summary": {
      "totalTicketsProcessed": 2850,
      "totalPeriods": 7,
      "avgThroughput": 407.14,
      "maxThroughput": 520,
      "minThroughput": 285,
      "stdDeviation": 89.5
    },
    "peakPeriod": {
      "period": {
        "date": "2024-12-15"
      },
      "ticketsProcessed": 520,
      "avgServiceTime": 5.1,
      "avgWaitTime": 8.2
    },
    "lowPeriod": {
      "period": {
        "date": "2024-12-11"
      },
      "ticketsProcessed": 285,
      "avgServiceTime": 5.8,
      "avgWaitTime": 9.1
    },
    "byPeriod": [
      {
        "period": {
          "date": "2024-12-17"
        },
        "ticketsProcessed": 415,
        "avgServiceTime": 5.3,
        "avgWaitTime": 8.4
      },
      {
        "period": {
          "date": "2024-12-16"
        },
        "ticketsProcessed": 465,
        "avgServiceTime": 5.1,
        "avgWaitTime": 8.3
      },
      {
        "period": {
          "date": "2024-12-15"
        },
        "ticketsProcessed": 520,
        "avgServiceTime": 5.0,
        "avgWaitTime": 8.0
      },
      {
        "period": {
          "date": "2024-12-14"
        },
        "ticketsProcessed": 395,
        "avgServiceTime": 5.4,
        "avgWaitTime": 8.6
      },
      {
        "period": {
          "date": "2024-12-13"
        },
        "ticketsProcessed": 420,
        "avgServiceTime": 5.2,
        "avgWaitTime": 8.5
      },
      {
        "period": {
          "date": "2024-12-12"
        },
        "ticketsProcessed": 350,
        "avgServiceTime": 5.6,
        "avgWaitTime": 8.8
      },
      {
        "period": {
          "date": "2024-12-11"
        },
        "ticketsProcessed": 285,
        "avgServiceTime": 5.8,
        "avgWaitTime": 9.1
      }
    ]
  }
}
```

---

## 5. SLA Compliance
**Endpoint**: `GET /api/dashboard/kpis/sla`

### Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/sla?maxWaitTime=10&maxServiceTime=15"
```

### Response
```json
{
  "message": "SLA compliance metrics retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "slaTargets": {
      "maxWaitTime": 10,
      "maxServiceTime": 15
    },
    "overall": {
      "totalTickets": 2850,
      "waitTimeCompliance": {
        "compliant": 2556,
        "noncompliant": 294,
        "complianceRate": "89.7%"
      },
      "serviceTimeCompliance": {
        "compliant": 2698,
        "noncompliant": 152,
        "complianceRate": "94.7%"
      },
      "overallCompliance": {
        "compliant": 2500,
        "noncompliant": 350,
        "complianceRate": "87.7%"
      }
    },
    "byService": [
      {
        "serviceType": "registration",
        "totalTickets": 850,
        "waitTime": {
          "compliant": 782,
          "noncompliant": 68,
          "complianceRate": "92.0%"
        },
        "serviceTime": {
          "compliant": 816,
          "noncompliant": 34,
          "complianceRate": "96.0%"
        },
        "overallComplianceRate": "90.0%"
      },
      {
        "serviceType": "payment",
        "totalTickets": 920,
        "waitTime": {
          "compliant": 818,
          "noncompliant": 102,
          "complianceRate": "89.0%"
        },
        "serviceTime": {
          "compliant": 893,
          "noncompliant": 27,
          "complianceRate": "97.0%"
        },
        "overallComplianceRate": "88.0%"
      },
      {
        "serviceType": "document_collection",
        "totalTickets": 1080,
        "waitTime": {
          "compliant": 950,
          "noncompliant": 130,
          "complianceRate": "88.0%"
        },
        "serviceTime": {
          "compliant": 995,
          "noncompliant": 85,
          "complianceRate": "92.0%"
        },
        "overallComplianceRate": "85.0%"
      }
    ]
  }
}
```

---

## 6. KPI Trends
**Endpoint**: `GET /api/dashboard/kpis/trends`

### Request
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/dashboard/kpis/trends?days=14"
```

### Response
```json
{
  "message": "KPI trends retrieved",
  "timestamp": "2024-12-17T14:30:00Z",
  "data": {
    "period": {
      "days": 14,
      "startDate": "2024-12-03",
      "endDate": "2024-12-17"
    },
    "summary": {
      "avgWaitTime": 8.7,
      "avgServiceTime": 5.3,
      "totalTicketsProcessed": 5650
    },
    "dailyTrends": [
      {
        "date": "2024-12-17",
        "avgWaitTime": 8.5,
        "avgServiceTime": 5.3,
        "ticketsProcessed": 415,
        "healthScore": 87
      },
      {
        "date": "2024-12-16",
        "avgWaitTime": 8.3,
        "avgServiceTime": 5.1,
        "ticketsProcessed": 465,
        "healthScore": 88
      },
      {
        "date": "2024-12-15",
        "avgWaitTime": 8.0,
        "avgServiceTime": 5.0,
        "ticketsProcessed": 520,
        "healthScore": 89
      },
      {
        "date": "2024-12-14",
        "avgWaitTime": 8.6,
        "avgServiceTime": 5.4,
        "ticketsProcessed": 395,
        "healthScore": 86
      },
      {
        "date": "2024-12-13",
        "avgWaitTime": 8.5,
        "avgServiceTime": 5.2,
        "ticketsProcessed": 420,
        "healthScore": 87
      },
      {
        "date": "2024-12-12",
        "avgWaitTime": 8.8,
        "avgServiceTime": 5.6,
        "ticketsProcessed": 350,
        "healthScore": 85
      },
      {
        "date": "2024-12-11",
        "avgWaitTime": 9.1,
        "avgServiceTime": 5.8,
        "ticketsProcessed": 285,
        "healthScore": 83
      },
      {
        "date": "2024-12-10",
        "avgWaitTime": 9.3,
        "avgServiceTime": 5.9,
        "ticketsProcessed": 280,
        "healthScore": 82
      },
      {
        "date": "2024-12-09",
        "avgWaitTime": 9.2,
        "avgServiceTime": 5.7,
        "ticketsProcessed": 310,
        "healthScore": 83
      },
      {
        "date": "2024-12-08",
        "avgWaitTime": 9.0,
        "avgServiceTime": 5.5,
        "ticketsProcessed": 325,
        "healthScore": 84
      },
      {
        "date": "2024-12-07",
        "avgWaitTime": 8.7,
        "avgServiceTime": 5.3,
        "ticketsProcessed": 410,
        "healthScore": 86
      },
      {
        "date": "2024-12-06",
        "avgWaitTime": 8.5,
        "avgServiceTime": 5.2,
        "ticketsProcessed": 445,
        "healthScore": 87
      },
      {
        "date": "2024-12-05",
        "avgWaitTime": 8.3,
        "avgServiceTime": 5.1,
        "ticketsProcessed": 480,
        "healthScore": 88
      },
      {
        "date": "2024-12-04",
        "avgWaitTime": 8.2,
        "avgServiceTime": 5.0,
        "ticketsProcessed": 495,
        "healthScore": 89
      },
      {
        "date": "2024-12-03",
        "avgWaitTime": 8.0,
        "avgServiceTime": 4.9,
        "ticketsProcessed": 510,
        "healthScore": 90
      }
    ],
    "trendAnalysis": {
      "waitTime": {
        "firstHalf": 8.98,
        "secondHalf": 8.44,
        "change": -6.0,
        "trend": "improving"
      },
      "serviceTime": {
        "firstHalf": 5.46,
        "secondHalf": 5.14,
        "change": -5.9,
        "trend": "improving"
      },
      "throughput": {
        "firstHalf": 357.86,
        "secondHalf": 455.0,
        "change": 27.1,
        "trend": "improving"
      },
      "overallTrend": "improving"
    }
  }
}
```

---

## Error Response Examples

### 401 Unauthorized
```json
{
  "message": "Authentication required",
  "timestamp": "2024-12-17T14:30:00Z",
  "error": "Missing or invalid JWT token"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied",
  "timestamp": "2024-12-17T14:30:00Z",
  "error": "Insufficient permissions. Staff role required."
}
```

### 400 Bad Request
```json
{
  "message": "Invalid parameters",
  "timestamp": "2024-12-17T14:30:00Z",
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

### 500 Server Error
```json
{
  "message": "Error retrieving KPI metrics",
  "timestamp": "2024-12-17T14:30:00Z",
  "error": "Database connection failed"
}
```

---

## Response Fields Reference

### Date Format
- `timestamp`: ISO 8601 format (2024-12-17T14:30:00Z)
- `startDate`, `endDate`: YYYY-MM-DD format

### Time Metrics
- All time values in **minutes**
- Percentiles: p50 (median), p95, p99

### Compliance Metrics
- Rates: Percentage format (e.g., "89.7%")
- Counts: Absolute numbers

### Health Score
- Range: 0-100
- Status: "Excellent", "Good", "Fair", "Poor"
- Color: "green", "yellow", "orange", "red"

### Trends
- "improving": Performance getting better
- "stable": Performance relatively constant
- "declining": Performance getting worse

---

**Last Updated**: Current Session  
**API Version**: 1.0
