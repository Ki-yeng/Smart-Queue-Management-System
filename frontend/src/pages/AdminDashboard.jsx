import { useEffect, useState } from "react";
import axios from "axios";
import { socket } from "../socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [queueOverview, setQueueOverview] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [routingRules, setRoutingRules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("routingRules")) || {
        fees_unpaid: { action: "route_finance", enabled: true },
        finance_cleared: { action: "unlock_exams", enabled: true },
        final_year_priority: { action: "priority", enabled: true },
      };
    } catch {
      return {};
    }
  });
  const [workflow, setWorkflow] = useState([
    { id: "finance", name: "Finance", enabled: true },
    { id: "academics", name: "Academics", enabled: true },
    { id: "exams", name: "Exams", enabled: true },
  ]);
  const [extraCounters, setExtraCounters] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);

  const token = localStorage.getItem("token");

  const logAction = (action) => {
    setAuditLogs((prev) => [{ action, time: new Date().toLocaleString() }, ...prev].slice(0, 30));
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(res.data?.data || null);
    } catch (err) {
      console.warn("Dashboard fetch failed", err);
    }
  };

  const fetchQueueOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/tickets/queue-overview`);
      setQueueOverview(res.data?.services || []);
    } catch (err) {
      console.warn("Queue overview failed", err);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/integrations/status`);
      setIntegrations(res.data?.integrations || res.data || {});
    } catch (err) {
      console.warn("Integration status failed", err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchQueueOverview();
    fetchIntegrations();

    socket.connect();

    socket.on("ticketCreated", (ticket) => {
      logAction(`Ticket created: ${ticket.ticketNumber}`);
      fetchDashboard();
      fetchQueueOverview();
    });

    socket.on("ticketUpdated", (ticket) => {
      logAction(`Ticket updated: ${ticket.ticketNumber}`);
      fetchDashboard();
      fetchQueueOverview();
    });

    const interval = setInterval(() => {
      fetchDashboard();
      fetchQueueOverview();
      fetchIntegrations();
    }, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const toggleRule = (key) => {
    const next = { ...routingRules, [key]: { ...routingRules[key], enabled: !routingRules[key].enabled } };
    setRoutingRules(next);
    localStorage.setItem("routingRules", JSON.stringify(next));
    logAction(`Rule ${key} ${next[key].enabled ? "enabled" : "disabled"}`);
  };

  const toggleWorkflowStep = (id) => {
    const next = workflow.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setWorkflow(next);
    logAction(`Workflow step ${id} ${next.find((x) => x.id === id).enabled ? "enabled" : "disabled"}`);
  };

  const simulateAddCounters = (n) => {
    setExtraCounters((c) => Math.max(0, c + n));
    logAction(`${n > 0 ? "Added" : "Removed"} ${Math.abs(n)} temporary counters`);
  };

  const summary = dashboard?.summary || {};
  const serviceTypes = dashboard?.serviceTypes || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Total Tickets Today" value={summary.totalTicketsToday || 0} />
          <KpiCard label="Total Queue Length" value={summary.totalQueueLength || 0} />
          <KpiCard label="Avg Wait (mins)" value={summary.avgWaitingTime || 0} />
          <KpiCard label="Avg Service (mins)" value={summary.avgServiceTime || 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow p-4 lg:col-span-2">
            <h3 className="font-bold mb-3">Centralized Queue Monitor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {queueOverview.length === 0 && <div className="text-sm text-gray-500">No queue data</div>}
              {queueOverview.map((q) => (
                <div key={q.serviceType} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{q.serviceType}</div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        q.waiting > 20
                          ? "bg-red-100 text-red-700"
                          : q.waiting > 8
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {q.waiting > 20 ? "High" : q.waiting > 8 ? "Medium" : "Low"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {q.waiting} waiting ? {q.estimatedWaitMins} mins
                  </div>
                  <div className="text-xs text-gray-500">Counters open: {q.counters?.open || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">API Integration Manager</h3>
            <div className="space-y-2">
              {Object.keys(integrations).length === 0 && <div className="text-sm text-gray-500">No integration data</div>}
              {Object.entries(integrations).map(([key, info]) => (
                <div key={key} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="font-semibold capitalize">{key}</div>
                    <div className="text-xs text-gray-500">{info.status || info.message || "Unknown"}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      info.connected || info.status === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {info.connected || info.status === "connected" ? "Connected" : "Error"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Department Performance</h3>
            <div className="space-y-2">
              {serviceTypes.length === 0 && <div className="text-sm text-gray-500">No service data</div>}
              {serviceTypes.map((s) => (
                <div key={s._id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="font-semibold">{s._id}</div>
                    <div className="text-xs text-gray-500">Waiting: {s.waiting} ? Serving: {s.serving}</div>
                  </div>
                  <div className="text-xs text-gray-600">Completed: {s.completed}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Smart Routing Rules Engine</h3>
            <div className="space-y-2">
              {Object.keys(routingRules).map((k) => (
                <div key={k} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="font-semibold">{k.replace(/_/g, " ")}</div>
                    <div className="text-xs text-gray-500">Action: {routingRules[k].action}</div>
                  </div>
                  <button onClick={() => toggleRule(k)} className="text-sm text-blue-600">
                    {routingRules[k].enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Workflow Automation Designer</h3>
            <div className="flex flex-wrap gap-3">
              {workflow.map((step, i) => (
                <div key={step.id} className="border rounded p-3">
                  <div className="font-semibold">{step.name}</div>
                  <button onClick={() => toggleWorkflowStep(step.id)} className="text-sm text-blue-600 mt-2">
                    {step.enabled ? "Enabled" : "Disabled"}
                  </button>
                  {i < workflow.length - 1 && <div className="text-xs text-gray-400 mt-2">Next ?</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Analytics & Bottleneck Detection</h3>
            <div className="text-sm text-gray-600">Peak Hour: {dashboard?.peakHour || "-"}</div>
            <div className="mt-3">
              <h4 className="font-semibold">Recent Audit</h4>
              {auditLogs.length === 0 && <div className="text-sm text-gray-500">No recent activity</div>}
              {auditLogs.map((l, i) => (
                <div key={i} className="text-xs text-gray-600">[{l.time}] {l.action}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Capacity Planning Tools</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => simulateAddCounters(1)} className="text-sm border rounded px-3 py-1">Add Counter</button>
              <button onClick={() => simulateAddCounters(-1)} className="text-sm border rounded px-3 py-1">Remove Counter</button>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Simulation: active counters {(dashboard?.counters?.active || 0) + extraCounters}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Reports & Forecasts</h3>
            <div className="text-sm text-gray-600">
              Completion Rate: {dashboard?.tickets?.completionRate || 0}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Waiting Tickets: {dashboard?.tickets?.waiting || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminDashboard;
