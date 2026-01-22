# Load Balancing Frontend Integration Guide

## Quick Start for Frontend Developers

### 1. Display System Load Status

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function SystemLoadDashboard() {
  const [loadMetrics, setLoadMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial load status
    fetch('http://localhost:5000/api/load-balance/status')
      .then(res => res.json())
      .then(data => {
        setLoadMetrics(data.status);
        setLoading(false);
      });

    // Connect to Socket.IO for real-time updates
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });

    socket.emit('joinDashboard');

    // Listen for load updates every 10 seconds
    socket.on('loadMetricsUpdated', (data) => {
      setLoadMetrics(data);
    });

    return () => socket.disconnect();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="load-dashboard">
      <h2>System Load Status</h2>
      <div className="metrics">
        <div className="metric">
          <label>Average Load</label>
          <span className={getLoadClass(loadMetrics.summary.avgLoadScore)}>
            {loadMetrics.summary.avgLoadScore}%
          </span>
        </div>
        <div className="metric">
          <label>Total Waiting</label>
          <span>{loadMetrics.summary.totalQueueLength}</span>
        </div>
        <div className="metric">
          <label>Available Counters</label>
          <span>{loadMetrics.summary.availableCounters}</span>
        </div>
        <div className="metric">
          <label>System Health</label>
          <span className={getHealthClass(loadMetrics.summary.systemLoad)}>
            {loadMetrics.summary.systemLoad}
          </span>
        </div>
      </div>
    </div>
  );
}

function getLoadClass(load) {
  if (load < 40) return 'healthy';
  if (load < 70) return 'moderate';
  return 'overloaded';
}

function getHealthClass(health) {
  return 'health-' + health.toLowerCase();
}

export default SystemLoadDashboard;
```

### 2. Display Service-Specific Load

```javascript
function ServiceLoadStatus({ serviceType }) {
  const [counters, setCounters] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Fetch service load
    fetch(`http://localhost:5000/api/load-balance/service/${serviceType}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCounters(data.counters));

    // Real-time updates
    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.emit('joinServiceQueue', { serviceType });

    socket.on('service-load-updated', (data) => {
      if (data.serviceType === serviceType) {
        setCounters(data.counterMetrics.map(m => ({
          id: m.counterId,
          counterName: m.counterName,
          loadScore: m.loadScore,
          queueLength: m.totalQueueLength,
          waitTime: m.estimatedWaitTime,
          staff: m.assignedStaff?.name || 'Unassigned'
        })));
      }
    });

    return () => socket.disconnect();
  }, [serviceType, token]);

  return (
    <div className="service-load">
      <h3>{serviceType} Service Status</h3>
      <table>
        <thead>
          <tr>
            <th>Counter</th>
            <th>Load</th>
            <th>Queue</th>
            <th>Wait Time</th>
            <th>Staff</th>
          </tr>
        </thead>
        <tbody>
          {counters.map(counter => (
            <tr key={counter.id} className={getLoadClass(counter.loadScore)}>
              <td>{counter.counterName}</td>
              <td className="load-bar">
                <div className="bar" style={{ width: counter.loadScore + '%' }}>
                  {counter.loadScore}%
                </div>
              </td>
              <td>{counter.queueLength}</td>
              <td>{counter.waitTime} min</td>
              <td>{counter.staff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ServiceLoadStatus;
```

### 3. Find Best Counter for Customer

```javascript
function BestCounterFinder({ serviceType }) {
  const [bestCounter, setBestCounter] = useState(null);
  const [priority, setPriority] = useState('normal');

  const findBestCounter = async () => {
    const params = new URLSearchParams({
      serviceType,
      priority
    });

    const response = await fetch(
      `http://localhost:5000/api/load-balance/best-counter?${params}`
    );
    const data = await response.json();
    setBestCounter(data.recommendation);
  };

  return (
    <div className="best-counter-finder">
      <h3>Find Available Counter</h3>
      <div className="controls">
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="normal">Normal</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>
        <button onClick={findBestCounter}>Find Counter</button>
      </div>

      {bestCounter && (
        <div className="result">
          <h4>Best Available Counter</h4>
          <p><strong>Counter:</strong> {bestCounter.counterName}</p>
          <p><strong>Current Load:</strong> {bestCounter.currentLoad}%</p>
          <p><strong>Estimated Wait:</strong> {bestCounter.estimatedWaitTime}</p>
          <p><strong>Staff:</strong> {bestCounter.staffAssigned}</p>
          <p className="reason">{bestCounter.reason}</p>
        </div>
      )}
    </div>
  );
}

export default BestCounterFinder;
```

### 4. Display Load Recommendations

```javascript
function LoadRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/load-balance/recommendations',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setRecommendations(data.suggestions);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const triggerRebalancing = async (serviceType) => {
    try {
      await fetch(
        `http://localhost:5000/api/load-balance/rebalance/${serviceType}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      alert('Queue rebalancing triggered!');
      fetchRecommendations();
    } catch (error) {
      console.error('Error triggering rebalancing:', error);
    }
  };

  return (
    <div className="recommendations">
      <h3>Load Balancing Recommendations</h3>
      {recommendations.length === 0 ? (
        <p>System is balanced. No recommendations at this time.</p>
      ) : (
        <ul>
          {recommendations.map((rec, idx) => (
            <li key={idx} className="recommendation-item">
              <h4>{rec.action}</h4>
              <p>{rec.reason}</p>
              <div className="from-to">
                <div className="counter">
                  <strong>From:</strong>
                  <p>{rec.fromCounter.name}</p>
                  <p>Load: {rec.fromCounter.currentLoad}%</p>
                  <p>Queue: {rec.fromCounter.queueLength}</p>
                </div>
                <span>→</span>
                <div className="counter">
                  <strong>To:</strong>
                  <p>{rec.toCounter.name}</p>
                  <p>Load: {rec.toCounter.currentLoad}%</p>
                  <p>Queue: {rec.toCounter.queueLength}</p>
                </div>
              </div>
              <button onClick={() => triggerRebalancing(rec.services[0])}>
                Apply Rebalancing
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LoadRecommendations;
```

### 5. Real-Time Load Visualization

```javascript
function LoadVisualization({ serviceType }) {
  const [counters, setCounters] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('joinServiceQueue', { serviceType });

    socket.on('service-load-updated', (data) => {
      if (data.serviceType === serviceType) {
        setCounters(data.counterMetrics);
      }
    });

    return () => socket.disconnect();
  }, [serviceType]);

  return (
    <div className="load-visualization">
      <h3>{serviceType} Load Visualization</h3>
      <div className="counters-grid">
        {counters.map(counter => (
          <div
            key={counter.counterId}
            className={`counter-card ${getLoadStatus(counter.loadScore)}`}
          >
            <h4>{counter.counterName}</h4>
            
            {/* Load Bar */}
            <div className="load-bar">
              <div 
                className="fill" 
                style={{ width: counter.loadScore + '%' }}
              />
              <span className="percentage">{counter.loadScore}%</span>
            </div>

            {/* Metrics */}
            <div className="metrics">
              <div className="metric">
                <span className="label">Queue:</span>
                <span className="value">{counter.totalQueueLength}</span>
              </div>
              <div className="metric">
                <span className="label">Wait:</span>
                <span className="value">{counter.estimatedWaitTime}m</span>
              </div>
              <div className="metric">
                <span className="label">Staff:</span>
                <span className="value">
                  {counter.assignedStaff?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="status">
              {counter.isAvailable ? (
                <span className="badge available">✓ Available</span>
              ) : (
                <span className="badge unavailable">⊘ Unavailable</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLoadStatus(load) {
  if (load < 40) return 'low';
  if (load < 70) return 'moderate';
  return 'high';
}

export default LoadVisualization;
```

### 6. Customer Queue Position Predictor

```javascript
function QueuePredictor({ serviceType, ticketId }) {
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const updatePrediction = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/load-balance/service/${serviceType}`
        );
        const data = await response.json();

        // Calculate estimated wait time based on best counter
        const bestCounter = data.counters[0];
        setPrediction({
          bestCounter: bestCounter.name,
          estimatedWait: bestCounter.estimatedWaitTime,
          queueLength: bestCounter.queueLength,
          staffName: bestCounter.staffAssigned
        });
      } catch (error) {
        console.error('Error predicting queue:', error);
      }
    };

    updatePrediction();
    const interval = setInterval(updatePrediction, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [serviceType]);

  if (!prediction) return <div>Loading prediction...</div>;

  return (
    <div className="queue-prediction">
      <h3>Your Estimated Wait Time</h3>
      <div className="prediction-content">
        <div className="large-number">
          {prediction.estimatedWait}
          <span className="unit">minutes</span>
        </div>
        <p>At counter: <strong>{prediction.bestCounter}</strong></p>
        <p>Current queue: {prediction.queueLength} people</p>
        <p>Served by: <strong>{prediction.staffName}</strong></p>
        <p className="note">
          Estimated based on current load. Time may vary based on service complexity.
        </p>
      </div>
    </div>
  );
}

export default QueuePredictor;
```

## CSS Styling Examples

```css
/* Load Dashboard */
.load-dashboard {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.metric {
  background: white;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.metric label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.metric span {
  font-size: 24px;
  font-weight: bold;
}

/* Load Bar */
.load-bar {
  height: 30px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.load-bar .fill {
  height: 100%;
  background: linear-gradient(to right, #4CAF50, #FFC107, #F44336);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.load-bar .percentage {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: bold;
  color: #333;
}

/* Counter Card */
.counter-card {
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}

.counter-card.low {
  border-left: 5px solid #4CAF50;
}

.counter-card.moderate {
  border-left: 5px solid #FFC107;
}

.counter-card.high {
  border-left: 5px solid #F44336;
}

.counter-card h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.counter-card .metrics {
  display: flex;
  justify-content: space-around;
  margin: 10px 0;
  font-size: 14px;
}

.counter-card .metric {
  text-align: center;
}

.counter-card .label {
  display: block;
  color: #666;
  font-size: 12px;
}

.counter-card .value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* Status Badge */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.badge.available {
  background: #C8E6C9;
  color: #2E7D32;
}

.badge.unavailable {
  background: #FFCDD2;
  color: #C62828;
}

/* Recommendation Item */
.recommendation-item {
  background: white;
  border-left: 4px solid #2196F3;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.from-to {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin: 15px 0;
}

.from-to .counter {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.from-to span {
  font-size: 20px;
  margin: 0 20px;
  color: #2196F3;
}
```

## State Management (Redux Example)

```javascript
// loadBalancingSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchSystemLoad = createAsyncThunk(
  'loadBalancing/fetchSystemLoad',
  async () => {
    const response = await fetch('http://localhost:5000/api/load-balance/status');
    return response.json();
  }
);

const loadBalancingSlice = createSlice({
  name: 'loadBalancing',
  initialState: {
    systemLoad: null,
    counterMetrics: [],
    recommendations: [],
    loading: false,
    error: null
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemLoad.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSystemLoad.fulfilled, (state, action) => {
        state.loading = false;
        state.systemLoad = action.payload.status;
        state.counterMetrics = action.payload.status.counterMetrics;
      })
      .addCase(fetchSystemLoad.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default loadBalancingSlice.reducer;
```

## Error Handling

```javascript
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    
    // Show user-friendly error message
    if (error.message.includes('401')) {
      // Handle authentication error
      redirectToLogin();
    } else if (error.message.includes('404')) {
      // Handle not found
      showNotification('Resource not found');
    } else {
      showNotification(`Error: ${error.message}`);
    }
    
    throw error;
  }
}
```

## Testing

```javascript
// __tests__/loadBalancing.test.js
import { render, screen, waitFor } from '@testing-library/react';
import SystemLoadDashboard from '../SystemLoadDashboard';

// Mock fetch
global.fetch = jest.fn();

describe('SystemLoadDashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should display system load', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        status: {
          summary: {
            avgLoadScore: 45,
            totalQueueLength: 12,
            availableCounters: 8,
            systemLoad: 'moderate'
          }
        }
      })
    });

    render(<SystemLoadDashboard />);

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });
});
```

## Performance Optimization

```javascript
// Use React.memo to prevent unnecessary re-renders
const CounterCard = React.memo(({ counter, serviceType }) => (
  <div className={`counter-card ${getLoadStatus(counter.loadScore)}`}>
    {/* Card content */}
  </div>
), (prevProps, nextProps) => {
  // Custom comparison for load score changes only
  return prevProps.counter.loadScore === nextProps.counter.loadScore;
});

// Use useMemo for expensive calculations
const memoizedCounters = useMemo(() => {
  return counters.filter(c => c.isAvailable)
    .sort((a, b) => a.loadScore - b.loadScore);
}, [counters]);

// Use useCallback for socket event handlers
const handleLoadUpdate = useCallback((data) => {
  setLoadMetrics(data);
}, []);
```

---

This guide provides all the code snippets and patterns needed to integrate the load balancing system into your React frontend. Adapt the examples to your specific needs and component structure.
