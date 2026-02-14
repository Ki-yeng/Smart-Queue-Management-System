import React, { useEffect, useRef, useState } from "react";
import {
  cancelTicket,
  createTicket,
  getLatestTicket,
  getNextTicket,
  getQueueOverview,
  getUserTickets,
} from "../services/ticketService";
import { getCurrentUser } from "../services/authService";
import { getUserUploads, uploadDocuments } from "../services/uploadService";
import { getClearanceStatus } from "../services/clearanceService";
import ClearanceStatus from "../components/ClearanceStatus";
import io from "socket.io-client";

const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "#facc15" },
  serving: { label: "Serving", color: "#3b82f6" },
  completed: { label: "Completed", color: "#22c55e" },
  transferred: { label: "Transferred", color: "#a855f7" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
};

const announcements = [
  "Admissions office closes at 4:30 PM today",
  "Carry your student ID for all services",
  "Library clearance ongoing this week",
  "Most services are available via the student portal",
];

const SMART_ACTIONS = [
  { id: "exam_block", title: "Clear Exam Block", dept: "Examinations" },
  { id: "fee_balance", title: "Resolve Fee Balance", dept: "Finance" },
  { id: "register_units", title: "Register Units", dept: "Academics" },
];

const SMART_ROUTING = {
  exam_block: "Examinations",
  fee_balance: "Finance",
  register_units: "Academics",
};

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
  const [queueOverview, setQueueOverview] = useState([]);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const socketRef = useRef(null);
  const notificationsEndRef = useRef(null);
  const token = localStorage.getItem("token");

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

  /* ---------------- CLEARANCE ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getClearanceStatus(user._id || user.id, token);
        setClearance(data || {});
      } catch (err) {
        console.warn("Clearance fetch failed", err);
        setClearance({
          finance: { status: "PENDING", message: "Outstanding fee balance detected" },
          academics: { status: "REGISTERED", message: "All required units registered" },
          examinations: { status: "BLOCKED", message: "Exam access blocked due to pending fees" },
          library: { status: "CLEARED", message: "No pending library books" },
        });
      }
    })();
  }, [user]);

  /* ---------------- LATEST TICKET ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const latest = await getLatestTicket(user._id, token);
      if (latest && latest.status !== "completed" && latest.status !== "cancelled") {
        setTicket(latest);
        setTicketStatus(latest.status);
      } else {
        setTicket(null);
        setTicketStatus("");
      }
    })();
  }, [user, token]);

  /* ---------------- POLLING ---------------- */
  useEffect(() => {
    if (!ticket || !user) return;

    const interval = setInterval(async () => {
      const updated = await getLatestTicket(user._id, token);
      if (!updated || updated.status === "completed" || updated.status === "cancelled") {
        setTicket(null);
        setTicketStatus("");
        clearInterval(interval);
      } else {
        setTicket(updated);
        setTicketStatus(updated.status);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ticket, user, token]);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(API_URL, { auth: { token } });

    socketRef.current.on("ticketStatusUpdate", (data) => {
      if (data.userId === user._id) {
        setTicketStatus(data.status);
        setNotifications((prev) => [
          {
            message: `Ticket #${data.ticketNumber} status updated: ${data.status}`,
            time: new Date(),
          },
          ...prev,
        ]);
      }
    });

    return () => socketRef.current.disconnect();
  }, [user, token]);

  useEffect(() => {
    notificationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notifications]);

  /* ---------------- QUEUE OVERVIEW ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQueueOverview();
        setQueueOverview(data?.services || []);
      } catch (err) {
        console.warn("Queue overview failed", err);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- HISTORY ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const history = await getUserTickets(user._id, token);
        setTicketHistory(history || []);
      } catch (err) {
        console.warn("Ticket history failed", err);
      }
    })();
  }, [user, token]);

  /* ---------------- UPLOADS ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getUserUploads(user._id, token);
        setUploads(data || []);
      } catch (err) {
        console.warn("Upload history failed", err);
      }
    })();
  }, [user, token]);

  /* ---------------- ANNOUNCEMENTS ---------------- */
  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const getOverallStatus = () => {
    const statuses = Object.values(clearance || {}).map((c) => c?.status).filter(Boolean);
    const hasBlocked = statuses.includes("BLOCKED");
    const hasPending = statuses.includes("PENDING");
    if (hasBlocked) return { label: "Blocked", tone: "bg-red-100 text-red-700" };
    if (hasPending) return { label: "Action Required", tone: "bg-yellow-100 text-yellow-800" };
    if (statuses.length) return { label: "Cleared", tone: "bg-green-100 text-green-700" };
    return { label: "Checking", tone: "bg-gray-100 text-gray-700" };
  };

  const getActionEligibility = (action) => {
    if (!action) return { eligible: true, reason: "" };
    const financeStatus = clearance?.finance?.status || "";
    if (action.id === "exam_block" && !["PAID", "CLEARED"].includes(financeStatus)) {
      return { eligible: false, reason: "Fees pending. Resolve Finance first." };
    }
    return { eligible: true, reason: "" };
  };

  /* ---------------- CREATE TICKET ---------------- */
  const handleGenerateTicket = async () => {
    if (!user) return alert("User not loaded");

    if (ticket && ticket.status !== "completed") {
      return alert(
        `You already have an active ticket for ${ticket.serviceType}. You can cancel it to join a new queue.`
      );
    }

    const eligibility = getActionEligibility(selectedAction);
    if (!eligibility.eligible) {
      return alert(eligibility.reason);
    }

    const resolvedDepartment = SMART_ROUTING[selectedAction.id];

    setLoadingTicket(true);
    try {
      const res = await createTicket(
        {
          serviceType: resolvedDepartment,
          studentName: user.name,
          email: user.email,
          userId: user._id,
        },
        token
      );

      let newTicket = res.ticket;

      const next = await getNextTicket(resolvedDepartment, token);
      if (next?.ticketNumber) {
        const ahead = Math.max(next.ticketNumber - newTicket.ticketNumber, 0);
        newTicket = {
          ...newTicket,
          peopleAhead: ahead,
          estimatedWait: ahead * 5,
        };
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

  const handleCancelTicket = async () => {
    if (!ticket) return;
    try {
      await cancelTicket(ticket._id);
      setTicket(null);
      setTicketStatus("");
      alert("Ticket canceled. You can now join a new queue.");
    } catch (err) {
      console.error("Cancel ticket failed", err);
      alert("Failed to cancel ticket");
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);
    try {
      await uploadDocuments({ files: uploadFiles, ticketId: ticket?._id, category: "clearance" }, token);
      setUploadFiles([]);
      const data = await getUserUploads(user._id, token);
      setUploads(data || []);
      alert("Documents uploaded.");
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadQrTicket = async () => {
    if (!ticket) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const data = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        serviceType: ticket.serviceType,
        student: user?.name,
      });
      const dataUrl = await QRCode.toDataURL(data, { width: 256, margin: 1 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `ticket-${ticket.ticketNumber}.png`;
      link.click();
    } catch (err) {
      console.error("QR generation failed", err);
      alert("QR download unavailable right now.");
    }
  };

  const overall = getOverallStatus();
  const eligibility = getActionEligibility(selectedAction);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow p-4 mb-6 gap-4">
          <div>
            <div className="font-bold text-lg">{user?.name || "Student"}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-sm text-gray-500">
              Reg No: {user?.registrationNumber || user?.studentNumber || "N/A"}
            </div>
            <div className="text-sm text-gray-500">
              Program: {user?.program || "N/A"} ? Year: {user?.studentYear || "N/A"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${overall.tone}`}>
              {overall.label}
            </span>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ClearanceStatus user={user} />

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Smart Actions</h3>
              {SMART_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAction(a)}
                  className={`w-full text-left p-3 mb-2 border rounded hover:bg-gray-50 ${
                    selectedAction.id === a.id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="font-bold">{a.title}</div>
                  <div className="text-xs text-gray-500">Routes to {SMART_ROUTING[a.id]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white p-4 rounded-xl shadow mb-6">
              <h3 className="font-bold text-xl mb-3">Ticket</h3>

              {ticket && ticket.status !== "completed" && ticket.status !== "cancelled" && (
                <button
                  onClick={handleCancelTicket}
                  className="w-full bg-red-600 text-white py-2 rounded mb-3"
                >
                  Cancel Active Ticket
                </button>
              )}

              <button
                onClick={handleGenerateTicket}
                disabled={loadingTicket || !eligibility.eligible}
                className="w-full bg-[#182B5C] text-white py-3 rounded font-bold mb-2 disabled:opacity-50"
                title={eligibility.reason}
              >
                {loadingTicket
                  ? "Joining..."
                  : eligibility.eligible
                  ? `Join ${SMART_ROUTING[selectedAction.id]} Queue`
                  : "Resolve Fees First"}
              </button>
              {!eligibility.eligible && (
                <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                  {eligibility.reason}
                </div>
              )}

              {!ticket && <p className="text-gray-500">No active ticket</p>}

              {ticket && (
                <div className="bg-[#F7F9FF] p-3 rounded">
                  <div className="font-bold">Ticket #{ticket.ticketNumber}</div>
                  <div>
                    Status:{" "}
                    <span
                      style={{
                        color: STATUS_CONFIG[ticketStatus]?.color || "#000",
                        fontWeight: "bold",
                      }}
                    >
                      {STATUS_CONFIG[ticketStatus]?.label || ticketStatus}
                    </span>
                  </div>
                  <div>People ahead: {ticket.peopleAhead ?? "-"}</div>
                  <div>Estimated wait: {ticket.estimatedWait ?? "-"} mins</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={downloadQrTicket}
                      className="text-sm bg-gray-900 text-white px-3 py-1 rounded"
                    >
                      Download QR Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow h-48 overflow-y-auto">
              <h3 className="font-bold text-xl mb-2">Notifications</h3>
              {notifications.length === 0 && <p className="text-sm">No notifications</p>}
              {notifications.map((n, i) => (
                <div key={i} className="text-sm">
                  {n.message}
                </div>
              ))}
              <div ref={notificationsEndRef} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Central Queue Overview</h3>
              <div className="space-y-2">
                {queueOverview.length === 0 && (
                  <div className="text-sm text-gray-500">Queue data unavailable</div>
                )}
                {queueOverview.map((q) => (
                  <div key={q.serviceType} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <div className="font-semibold">{q.serviceType}</div>
                      <div className="text-xs text-gray-500">
                        {q.waiting} waiting ? {q.estimatedWaitMins} mins
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        q.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Self-Service & Uploads</h3>
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    className="block w-full text-sm"
                  />
                  {uploadFiles.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2">
                      {uploadFiles.map((f) => f.name).join(", ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadFiles.length === 0}
                  className="w-full bg-[#D0B216] py-2 rounded disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload Documents"}
                </button>
                <div className="text-xs text-gray-500">Recent uploads</div>
                <div className="space-y-1 text-xs text-gray-600">
                  {(uploads || []).slice(0, 3).map((u) => (
                    <div key={u._id} className="truncate">{u.originalName}</div>
                  ))}
                  {(!uploads || uploads.length === 0) && <div>No uploads yet</div>}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <a className="border rounded p-2 text-center" href="/student/upload-docs">Open Upload Center</a>
                  <a className="border rounded p-2 text-center" href="/student/status">View Ticket Status</a>
                  <a className="border rounded p-2 text-center" href="/student/notifications">Notifications</a>
                  <a className="border rounded p-2 text-center" href="/student/profile">Profile</a>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Ticket History</h3>
              {ticketHistory.length === 0 && (
                <div className="text-sm text-gray-500">No ticket history yet</div>
              )}
              <div className="space-y-2">
                {ticketHistory.slice(0, 5).map((t) => (
                  <div key={t._id} className="border rounded p-2">
                    <div className="font-semibold">#{t.ticketNumber} ? {t.serviceType}</div>
                    <div className="text-xs text-gray-500">Status: {t.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-2">Announcements</h3>
              {announcements[announcementIndex]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
