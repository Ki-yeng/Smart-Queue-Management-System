import React, { useState, useEffect, useRef } from "react";
import { createTicket, getNextTicket, getLatestTicket } from "../services/ticketService";
import { getCurrentUser } from "../services/authService";
import ClearanceStatus from "../components/ClearanceStatus"; // ✅ ADD
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

  /* ---------------- USER ---------------- */
  /* ---------------- USER ---------------- */
useEffect(() => {
  (async () => {
    try {
      const me = await getCurrentUser();
      if (me) setUser(me.user || me);
      else {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    } catch {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    }
  })();
}, []);


  /* ---------------- LATEST TICKET ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const latest = await getLatestTicket(user._id, token);
      if (latest && latest.status !== "completed") {
        setTicket(latest);
        setTicketStatus(latest.status);
      } else {
        setTicket(null);
        setTicketStatus("");
      }
    })();
  }, [user]);

  /* ---------------- POLLING ---------------- */
  useEffect(() => {
    if (!ticket || !user) return;
    const interval = setInterval(async () => {
      const updated = await getLatestTicket(user._id, token);
      if (updated) setTicketStatus(updated.status);
    }, 5000);
    return () => clearInterval(interval);
  }, [ticket, user]);

  /* ---------------- SOCKET ---------------- */
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

  useEffect(() => {
    notificationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notifications]);

  /* ---------------- ANNOUNCEMENTS ---------------- */
  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- CLEARANCE (MOCK) ---------------- */
  /*
  useEffect(() => {
    setClearance({
      finance: { status: "Paid" },
      academics: { status: "Registered" },
      examinations: { status: "Eligible" },
      library: { status: "Cleared" },
    });
  }, []);
  */

  /* ---------------- CREATE TICKET ---------------- */
  const handleGenerateTicket = async () => {
    if (!user) return alert("User not loaded");

    if (ticket && ticket.status !== "completed") {
      return alert(`You already have an active ticket for ${ticket.serviceType}. You can cancel it to join a new queue.`);
    }

    setLoadingTicket(true);
    try {
      const res = await createTicket({
        serviceType: selectedAction.dept,
        studentName: user.name,
        email: user.email,
        userId: user._id,
      });

      let newTicket = res.ticket;

      const next = await getNextTicket(selectedAction.dept, token);
      if (next?.ticketNumber) {
        const ahead = Math.max(next.ticketNumber - newTicket.ticketNumber, 0);
        newTicket = { ...newTicket, peopleAhead: ahead, estimatedWait: ahead * 5 };
      }

      setTicket(newTicket);
      setTicketStatus(newTicket.status);
    } catch (err) {
      console.error("Ticket creation failed:", err);
      alert("Failed to join queue");
    } finally {
      setLoadingTicket(false);
    }
  };

  /* ---------------- CANCEL TICKET ---------------- */
  const handleCancelTicket = async () => {
    if (!ticket) return;
    try {
      await fetch(`${API_URL}/api/tickets/cancel/${ticket._id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTicket(null);
      setTicketStatus("");
      alert("Ticket canceled. You can now join a new queue.");
    } catch (err) {
      console.error("Cancel ticket failed", err);
      alert("Failed to cancel ticket");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between bg-white rounded-xl shadow p-4 mb-6">
          <div>
            <div className="font-bold">{user?.name || "Student"}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-red-600 font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="space-y-6">

            {/* ✅ ADD */}
            <ClearanceStatus user={user} />

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Smart Actions</h3>
              {SMART_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAction(a)}
                  className={`w-full text-left p-3 mb-2 border rounded hover:bg-gray-50 ${selectedAction.id === a.id ? "bg-gray-100" : ""}`}
                >
                  <div className="font-bold">{a.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* CENTER */}
          <div>
            <div className="bg-white p-4 rounded-xl shadow mb-6">
              <h3 className="font-bold text-xl mb-3">Ticket</h3>

              {ticket && ticket.status !== "completed" && (
                <button
                  onClick={handleCancelTicket}
                  className="w-full bg-red-600 text-white py-2 rounded mb-3"
                >
                  Cancel Active Ticket
                </button>
              )}

              <button
                onClick={handleGenerateTicket}
                disabled={loadingTicket}
                className="w-full bg-[#182B5C] text-white py-3 rounded font-bold mb-4"
              >
                {loadingTicket ? "Joining..." : `Join ${selectedAction.dept} Queue`}
              </button>

              {!ticket && <p className="text-gray-500">No active ticket</p>}

              {ticket && (
                <div className="bg-[#F7F9FF] p-3 rounded">
                  <div className="font-bold">Ticket #{ticket.ticketNumber}</div>
                  <div>Status: {ticketStatus}</div>
                  <div>People ahead: {ticket.peopleAhead ?? "—"}</div>
                  <div>Estimated wait: {ticket.estimatedWait ?? "—"} mins</div>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow h-48 overflow-y-auto">
              <h3 className="font-bold text-xl mb-2">Notifications</h3>
              {notifications.length === 0 && <p className="text-sm">No notifications</p>}
              {notifications.map((n, i) => (
                <div key={i} className="text-sm">{n.message}</div>
              ))}
              <div ref={notificationsEndRef} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-bold text-xl mb-2">Announcements</h3>
            {announcements[announcementIndex]}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
