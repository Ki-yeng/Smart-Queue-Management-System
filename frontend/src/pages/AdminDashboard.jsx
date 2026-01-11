import { useEffect, useState } from "react";
import axios from "axios";
import { socket } from "../socket";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_URL}/tickets`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.tickets || [];

      setTickets(data);
    } catch (err) {
      setError("Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on("ticketCreated", (ticket) => {
      setTickets((prev) => [...prev, ticket]);
      logAction(`Ticket created: ${ticket.ticketNumber}`);
    });

    socket.on("ticketUpdated", (ticket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticket._id ? ticket : t))
      );
      logAction(`Ticket updated: ${ticket.ticketNumber}`);
    });

    return () => socket.disconnect();
  }, []);

  const logAction = (action) => {
    setAuditLogs((prev) => [
      { action, time: new Date().toLocaleString() },
      ...prev,
    ]);
  };

  /* ================= GRAPH DATA ================= */

  const serviceCounts = tickets.reduce((acc, t) => {
    acc[t.service] = (acc[t.service] || 0) + 1;
    return acc;
  }, {});

  const pending = tickets.filter((t) => t.status === "pending").length;
  const completed = tickets.filter((t) => t.status === "completed").length;

  const maxServiceCount = Math.max(...Object.values(serviceCounts), 1);

  return (
    <div style={{ minHeight: "100vh", padding: 20, background: "#182B5C" }}>
      <h1 style={{ color: "#D0B216" }}>Admin Dashboard</h1>

      {loading && <p style={{ color: "white" }}>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ================= GRAPH 1 ================= */}
      <div style={card}>
        <h3>📊 Tickets per Service</h3>

        {Object.keys(serviceCounts).map((service) => (
          <div key={service} style={{ marginBottom: 10 }}>
            <span>{service}</span>
            <div style={barContainer}>
              <div
                style={{
                  ...bar,
                  width: `${(serviceCounts[service] / maxServiceCount) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ================= GRAPH 2 ================= */}
      <div style={card}>
        <h3>📈 Queue Status Distribution</h3>

        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <p>Pending</p>
            <div style={barContainer}>
              <div
                style={{
                  ...bar,
                  width: `${(pending / (pending + completed || 1)) * 100}%`,
                  background: "#D0B216",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <p>Completed</p>
            <div style={barContainer}>
              <div
                style={{
                  ...bar,
                  width: `${(completed / (pending + completed || 1)) * 100}%`,
                  background: "#182B5C",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= GRAPH 3 ================= */}
      <div style={card}>
        <h3>⚠ SLA Risk Indicator</h3>

        <div style={barContainer}>
          <div
            style={{
              ...bar,
              width: `${Math.min(pending * 10, 100)}%`,
              background: pending > 10 ? "red" : "#D0B216",
            }}
          />
        </div>

        <p>
          {pending > 10
            ? "High queue pressure detected"
            : "Queue levels normal"}
        </p>
      </div>

      {/* ================= AUDIT ================= */}
      <div style={card}>
        <h3>🛡 Audit Logs</h3>
        {auditLogs.slice(0, 5).map((log, i) => (
          <p key={i}>
            [{log.time}] {log.action}
          </p>
        ))}
      </div>
    </div>
  );
};

/* ================= STYLES ================= */

const card = {
  background: "white",
  padding: 15,
  borderRadius: 8,
  marginTop: 20,
};

const barContainer = {
  background: "#eee",
  borderRadius: 6,
  height: 16,
  width: "100%",
};

const bar = {
  height: "100%",
  borderRadius: 6,
  background: "#182B5C",
};

export default AdminDashboard;
