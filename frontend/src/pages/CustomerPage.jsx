// src/pages/CustomerPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { createTicket, getNextTicket, getLatestTicket } from "../services/ticketService";
import { getCurrentUser } from "../services/authService";
import io from "socket.io-client";

const announcements = [
  "📢 Admissions office closes at 4:30 PM today",
  "🧾 Carry your student ID for all services",
  "📚 Library clearance ongoing this week",
  "💡 Most services are available via the student portal",
];

const SMART_ACTIONS = [
  { id: "exam_block", title: "Clear Exam Block", dept: "Examinations" },
  { id: "fee_balance", title: "Resolve Fee Balance", dept: "Finance" },
  { id: "register_units", title: "Register Units", dept: "Academics" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CustomerPage = () => {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [ticketStatus, setTicketStatus] = useState("");
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [clearance, setClearance] = useState({});
  const [selectedAction, setSelectedAction] = useState(SMART_ACTIONS[0]);
  const socketRef = useRef(null);
  const notificationsEndRef = useRef(null);

  const token = localStorage.getItem("token");

  // Load current user
  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        setUser(me.user || me);
      } catch (err) {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    })();
  }, []);

  // Load latest ticket for user
  useEffect(() => {
    if (!user) return;
    const fetchTicket = async () => {
      try {
        const latest = await getLatestTicket(user._id, token);
        if (latest) {
          setTicket(latest);
          setTicketStatus(latest.status);
        }
      } catch (err) {
        console.warn("No latest ticket found", err);
      }
    };
    fetchTicket();
  }, [user]);

  // Ticket status polling every 5 seconds
  useEffect(() => {
    if (!ticket) return;
    const interval = setInterval(async () => {
      try {
        const updated = await getLatestTicket(user._id, token);
        if (updated) setTicketStatus(updated.status);
      } catch (err) {
        console.warn("Ticket polling failed", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [ticket, user]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(API_URL, { auth: { token } });
    socketRef.current.on("ticketStatusUpdate", (data) => {
      if (data.studentId === user._id) {
        setTicketStatus(data.status);
        setNotifications((prev) => [
          { message: `Ticket #${data.ticketNumber} status updated: ${data.status}`, time: new Date() },
          ...prev,
        ]);
      }
    });
    return () => socketRef.current.disconnect();
  }, [user]);

  // Auto-scroll notifications
  useEffect(() => {
    notificationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notifications]);

  // Rotate announcements
  useEffect(() => {
    const t = setInterval(() => setAnnouncementIndex((i) => (i + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Mock clearance fetch
  useEffect(() => {
    setClearance({
      finance: { status: "Paid", note: "All dues cleared" },
      academics: { status: "Registered", note: "All units ok" },
      examinations: { status: "Eligible", note: "No blocks" },
      library: { status: "Cleared", note: "No returns" },
    });
  }, []);

  const smartRouteForAction = (actionId) => {
    const a = SMART_ACTIONS.find((s) => s.id === actionId) || SMART_ACTIONS[0];
    let allowed = true, reason = null;
    if (a.dept === "Examinations" && clearance.finance?.status !== "Paid") {
      allowed = false; reason = "Resolve fees first";
    }
    if (a.dept === "Academics" && clearance.academics?.status === "Registered") {
      allowed = false; reason = "Already registered";
    }
    return { ...a, allowed, reason };
  };

  const handleSelectAction = (action) => setSelectedAction(action);

  const handleGenerateTicket = async () => {
    if (!user) return alert("User not loaded");
    if (ticket && ticket.status !== "completed") return alert("You already have an active ticket");
    setLoadingTicket(true);
    try {
      const data = await createTicket(selectedAction.dept, user.name, user.email, token);
      setTicket(data.ticket);
      setTicketStatus(data.ticket.status);

      // Estimate waiting time
      const next = await getNextTicket(selectedAction.dept, token);
      if (next?.ticketNumber) {
        const ahead = Math.max(next.ticketNumber - data.ticket.ticketNumber, 0);
        data.peopleAhead = ahead;
        data.estimatedWait = ahead * 5; // 5 min per person
      }
    } catch (err) {
      console.error("Ticket error:", err);
      alert("Failed to join queue");
    } finally {
      setLoadingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#182B5C] text-white flex items-center justify-center font-bold">{user?.name?.[0] || "S"}</div>
            <div>
              <div className="font-bold">{user?.name || "Student"}</div>
              <div className="text-sm text-gray-500">{user?.email || "regno@example.edu"}</div>
            </div>
          </div>
          <button
            onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.reload(); }}
            className="text-sm text-red-600 font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clearance */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold text-xl mb-3">My Clearance Status</h3>
              {Object.entries(clearance).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-semibold capitalize">{k}</div>
                    <div className="text-sm text-gray-500">{v.note}</div>
                  </div>
                  <div className={`font-bold ${["Cleared","Paid","Registered","Eligible"].includes(v.status) ? "text-green-600" : "text-red-600"}`}>{v.status}</div>
                </div>
              ))}
            </div>

            {/* Smart Actions */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold text-xl mb-3">Smart Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SMART_ACTIONS.map((c) => {
                  const route = smartRouteForAction(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectAction(c)}
                      className={`p-3 rounded-lg text-left border ${selectedAction.id === c.id ? "border-[#182B5C] bg-[#F7F9FF]" : "bg-white"} ${!route.allowed ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg"}`}
                      title={!route.allowed ? route.reason : ""}
                      disabled={!route.allowed}
                    >
                      <div className="font-bold">{c.title}</div>
                      <div className="text-sm text-gray-500">Dept: <span className="font-semibold">{route.dept}</span></div>
                      {!route.allowed && <div className="text-xs text-red-600 mt-1">{route.reason}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ticket panel */}
          <div className="col-span-1 lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h3 className="font-bold text-xl mb-3">{selectedAction.title}</h3>
              <button
                onClick={handleGenerateTicket}
                disabled={loadingTicket || (ticket && ticket.status !== "completed")}
                className={`w-full py-3 rounded-lg font-bold ${loadingTicket ? "bg-gray-300" : "bg-[#182B5C] text-white"}`}
              >
                {loadingTicket ? "Joining..." : `Join ${smartRouteForAction(selectedAction.id).dept} Queue`}
              </button>

              {ticket && (
                <div className="mt-4 p-3 bg-[#F7F9FF] rounded">
                  <div className="font-bold">Ticket #{ticket.ticketNumber || ticket._id}</div>
                  <div className="text-sm text-gray-600">Status: {ticketStatus}</div>
                  <div className="text-sm text-gray-600">People ahead: {ticket.peopleAhead ?? "—"}</div>
                  <div className="text-sm text-gray-600">Estimated wait: {ticket.estimatedWait ?? "—"} mins</div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold text-xl mb-3">Notifications</h3>
              {notifications.length === 0 && <p className="text-sm text-gray-500">No notifications yet</p>}
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {notifications.map((n, i) => (
                  <li key={i} className="text-sm">{n.message} <span className="text-gray-400">({n.time.toLocaleTimeString()})</span></li>
                ))}
                <div ref={notificationsEndRef} />
              </ul>
            </div>
          </div>

          {/* Announcements */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h3 className="font-bold text-xl mb-3">Announcements</h3>
              <div className="p-4 bg-[#182B5C]/5 rounded text-center font-medium text-[#182B5C]">{announcements[announcementIndex]}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
