/**
 * Load Balancing Dashboard Component
 * Displays real-time counter load metrics and system health
 */

import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import counterService from '../services/counterService';

export default function LoadBalancingDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  // Fetch initial metrics
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Listen for real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleLoadMetricsUpdated = (data) => {
      setMetrics(data);
      setError(null);
    };

    socket.on('loadMetricsUpdated', handleLoadMetricsUpdated);

    return () => {
      socket.off('loadMetricsUpdated', handleLoadMetricsUpdated);
    };
  }, [socket]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await counterService.getLoadBalancingDashboard();
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching load metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const getLoadStatusColor = (loadScore) => {
    if (loadScore <= 30) return 'bg-green-500';
    if (loadScore <= 60) return 'bg-yellow-500';
    if (loadScore <= 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLoadStatusLabel = (loadScore) => {
    if (loadScore <= 30) return 'Light';
    if (loadScore <= 60) return 'Moderate';
    if (loadScore <= 80) return 'Heavy';
    return 'Overloaded';
  };

  const getSystemLoadColor = (systemLoad) => {
    switch (systemLoad) {
      case 'low':
        return 'text-green-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const { summary, counterMetrics = [], mostLoaded, leastLoaded, recommendations = [] } = metrics;

  return (
    <div className="space-y-4">
      {/* System Overview Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Total Counters */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-gray-600 text-sm">Total Counters</p>
          <p className="text-3xl font-bold text-gray-800">{summary.totalCounters}</p>
        </div>

        {/* Available Counters */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-gray-600 text-sm">Available</p>
          <p className="text-3xl font-bold text-green-600">{summary.availableCounters}</p>
        </div>

        {/* System Load */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-gray-600 text-sm">System Load</p>
          <p className={`text-3xl font-bold ${getSystemLoadColor(summary.systemLoad)}`}>
            {summary.systemLoad.charAt(0).toUpperCase() + summary.systemLoad.slice(1)}
          </p>
          <p className="text-sm text-gray-500">{summary.avgLoadScore}% avg</p>
        </div>

        {/* Total Queue Length */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <p className="text-gray-600 text-sm">Customers Waiting</p>
          <p className="text-3xl font-bold text-blue-600">{summary.totalQueueLength}</p>
        </div>
      </div>

      {/* Alerts Section */}
      {summary.overloadedCounters > 0 && (
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-3">
          <p className="text-red-700 font-semibold">⚠️ {summary.overloadedCounters} counter(s) overloaded</p>
          <p className="text-sm text-red-600 mt-1">Consider opening additional counters or rebalancing tickets</p>
        </div>
      )}

      {/* Counter Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800">Counter Load Status</h3>
          <p className="text-sm text-gray-600 mt-1">Sorted by load (lowest first)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Counter</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Queue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Load</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Est. Wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {counterMetrics.map((counter) => (
                <tr key={counter.counterId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{counter.counterName}</p>
                    <p className="text-xs text-gray-500">{counter.serviceTypes?.join(', ')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      counter.status === 'open' ? 'bg-green-100 text-green-800' :
                      counter.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {counter.status.charAt(0).toUpperCase() + counter.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">
                      {counter.totalQueueLength} customer{counter.totalQueueLength !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      ({counter.servingCount} serving, {counter.waitingCount} waiting)
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getLoadStatusColor(counter.loadScore)}`}
                          style={{ width: `${counter.loadScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-10 text-right">
                        {counter.loadScore}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getLoadStatusLabel(counter.loadScore)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    ~{counter.estimatedWaitTime} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extremes Section */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {mostLoaded && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <h4 className="font-semibold text-red-800 mb-2">🔴 Most Loaded</h4>
            <p className="text-lg font-bold text-gray-800">{mostLoaded.counterName}</p>
            <p className="text-sm text-gray-600">Load: {mostLoaded.loadScore}%</p>
            <p className="text-sm text-gray-600">{mostLoaded.totalQueueLength} in queue</p>
          </div>
        )}

        {leastLoaded && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <h4 className="font-semibold text-green-800 mb-2">🟢 Least Loaded</h4>
            <p className="text-lg font-bold text-gray-800">{leastLoaded.counterName}</p>
            <p className="text-sm text-gray-600">Load: {leastLoaded.loadScore}%</p>
            <p className="text-sm text-gray-600">{leastLoaded.totalQueueLength} in queue</p>
          </div>
        )}
      </div>

      {/* Rebalancing Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            💡 Load Rebalancing Recommendations ({recommendations.length})
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="rounded border border-blue-100 bg-white p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">{rec.reason}</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{rec.fromCounter.name}</p>
                    <p className="text-gray-600">Load: {rec.fromCounter.loadScore}%</p>
                  </div>
                  <span className="text-blue-600">→</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{rec.toCounter.name}</p>
                    <p className="text-gray-600">Load: {rec.toCounter.loadScore}%</p>
                  </div>
                </div>
                {rec.commonServices && rec.commonServices.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Services: {rec.commonServices.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-right">
        Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
