import { useEffect, useState } from "react";
import axios from "axios";
import { socket } from "../socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminDashboard = () => {
  // Core data
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  // System KPIs & health
  const [kpis, setKpis] = useState({ activeCounters: 0, avgWait: 0, totalWaiting: 0 });
  const [integrations, setIntegrations] = useState({ finance: true, academics: true, exams: true });

  // Rules engine (stored in-memory / localStorage)
  const [routingRules, setRoutingRules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("routingRules")) || {
        fees_unpaid: { action: "route_finance", enabled: true },
        finance_cleared: { action: "unlock_exams", enabled: true },
        final_year_priority: { action: "priority", enabled: true },
      };
    } catch (e) {
      return {};
    }
  });

  // Automation / workflow steps
  const [workflow, setWorkflow] = useState([
    { id: "finance", name: "Finance", enabled: true },
    { id: "academics", name: "Academics", enabled: true },
    { id: "exams", name: "Exams", enabled: true },
  ]);

  // Capacity planning
  const [extraCounters, setExtraCounters] = useState(0);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_URL}/tickets`).catch(() => ({ data: [] }));
      const data = Array.isArray(res.data) ? res.data : res.data.tickets || [];

      setTickets(data);
      // quick kpi derivation
      const waiting = data.filter((t) => t.status !== "completed").length;
      const avgWait = Math.round((waiting * 5) / Math.max(1, data.length));
      setKpis({ activeCounters: 6 + extraCounters, avgWait, totalWaiting: waiting });
    } catch (err) {
      setError("Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [extraCounters]);

  useEffect(() => {
    socket.connect();

    socket.on("ticketCreated", (ticket) => {
      setTickets((prev) => [...prev, ticket]);
      logAction(`Ticket created: ${ticket.ticketNumber}`);
    });

    socket.on("ticketUpdated", (ticket) => {
      setTickets((prev) => prev.map((t) => (t._id === ticket._id ? ticket : t)));
      logAction(`Ticket updated: ${ticket.ticketNumber}`);
    });

    // integration heartbeat (simulated)
    const iv = setInterval(() => {
      setIntegrations((s) => ({ ...s }));
    }, 10000);

    return () => {
      clearInterval(iv);
      socket.disconnect();
    };
  }, []);

  const logAction = (action) => {
    setAuditLogs((prev) => [{ action, time: new Date().toLocaleString() }, ...prev].slice(0, 50));
  };

  /* ================= Derived analytics ================= */
  const ticketsPerService = tickets.reduce((acc, t) => {
    const key = t.service || t.serviceType || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const waiting = tickets.filter((t) => t.status !== "completed").length;
  const completed = tickets.filter((t) => t.status === "completed").length;

  const bottlenecks = Object.entries(ticketsPerService).map(([k, v]) => ({ service: k, count: v }));

  /* ================= Rules + Workflow handlers ================= */
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
    setExtraCounters((c) => c + n);
    logAction(`Added ${n} temporary counters`);
  };

  /* ================= RENDER ================= */
  return (
    <div style={{ minHeight: "100vh", padding: 20, background: "#F3F4F6" }}>
      <h1 style={{ color: "#0f172a" }}>Admin Dashboard</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={smallCard}>
          <div style={{ fontSize: 12, color: "#374151" }}>Active Counters</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{kpis.activeCounters}</div>
        </div>
        <div style={smallCard}>
          <div style={{ fontSize: 12, color: "#374151" }}>Total Waiting</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{kpis.totalWaiting}</div>
        </div>
        <div style={smallCard}>
          <div style={{ fontSize: 12, color: "#374151" }}>Avg Wait (mins)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{kpis.avgWait}</div>
        </div>
        <div style={smallCard}>
          <div style={{ fontSize: 12, color: "#374151" }}>Integrations Healthy</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{Object.values(integrations).every(Boolean) ? 'Yes' : 'Issues'}</div>
        </div>
      </div>

      {/* Central Queue Monitor */}
      <div style={card}>
        <h3>Centralized Queue Monitor</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {bottlenecks.map((b) => (
            <div key={b.service} style={{ minWidth: 160, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700 }}>{b.service}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{b.count} waiting</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
                  <div style={{ width: `${Math.min(100, b.count * 8)}%`, height: '100%', background: b.count > 20 ? '#dc2626' : b.count > 8 ? '#f59e0b' : '#10b981', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Manager + Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <h3>API Integration Manager</h3>
          <div style={{ display:'flex', gap:8 }}>
            <IntegrationRow name="Finance ERP" ok={integrations.finance} />
            <IntegrationRow name="Academic Records" ok={integrations.academics} />
            <IntegrationRow name="Exams Scheduler" ok={integrations.exams} />
          </div>
        </div>

        <div style={card}>
          <h3>Smart Routing Rules</h3>
          {Object.keys(routingRules).map((k) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:6 }}>
              <div>
                <div style={{ fontWeight:700 }}>{k}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>Action: {routingRules[k].action}</div>
              </div>
              <button onClick={() => toggleRule(k)} className="btn">{routingRules[k].enabled ? 'Disable' : 'Enable'}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Designer */}
      <div style={card}>
        <h3>Workflow Automation Designer</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {workflow.map((s, i) => (
            <div key={s.id} style={{ padding:8, borderRadius:6, background: s.enabled ? '#eef2ff' : '#fff', border:'1px solid #e5e7eb' }}>
              <div style={{ fontWeight:700 }}>{s.name}</div>
              <div style={{ marginTop:6 }}>
                <button onClick={() => toggleWorkflowStep(s.id)} className="btn">{s.enabled ? 'On' : 'Off'}</button>
                {i < workflow.length - 1 && <span style={{ marginLeft:8, marginRight:8 }}>→</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics & Capacity */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:12 }}>
        <div style={card}>
          <h3>Analytics & Bottleneck Detection</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Peak service</div>
              <div style={{ fontWeight:700 }}>{bottlenecks.sort((a,b)=>b.count-a.count)[0]?.service || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Peak volume</div>
              <div style={{ fontWeight:700 }}>{Math.max(...Object.values(ticketsPerService),0)}</div>
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <h4>Recent audit</h4>
            {auditLogs.slice(0,6).map((l,i)=> <div key={i} style={{ fontSize:12, color:'#374151' }}>[{l.time}] {l.action}</div>)}
          </div>
        </div>

        <div style={card}>
          <h3>Capacity Planning</h3>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => simulateAddCounters(1)} className="btn">Add Counter</button>
            <button onClick={() => simulateAddCounters(-1)} className="btn">Remove Counter</button>
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, color:'#6b7280' }}>Simulation: active counters</div>
            <div style={{ fontWeight:700 }}>{kpis.activeCounters}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* small helper components */
const IntegrationRow = ({ name, ok }) => (
  <div style={{ minWidth: 180, padding:8, borderRadius:8, border: '1px solid #e5e7eb' }}>
    <div style={{ fontWeight:700 }}>{name}</div>
    <div style={{ fontSize:12, color: ok ? '#059669' : '#dc2626' }}>{ok ? 'Connected' : 'Error'}</div>
  </div>
);

/* ================= STYLES ================= */

const card = {
  background: "white",
  padding: 16,
  borderRadius: 8,
  marginTop: 16,
};

const smallCard = {
  background: 'white', padding: 12, borderRadius: 8, minWidth: 160, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
};

export default AdminDashboard;
