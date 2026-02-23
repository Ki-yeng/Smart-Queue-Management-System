import React, { useEffect, useRef, useState } from "react";
import SidebarLayout from "../components/sidebarLayout";
import {
  getAllTickets,
  getTicketById,
  getWaitingTickets,
  staffAction,
  transferTicket,
} from "../services/ticketService";
import { getCurrentUser, logoutUser } from "../services/authService";
import axios from "axios";

const STATUS_BADGE = {
  waiting: { label: "Waiting", className: "bg-yellow-100 text-yellow-800" },
  serving: { label: "Serving", className: "bg-blue-100 text-blue-800" },
  on_hold: { label: "On Hold", className: "bg-gray-100 text-gray-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  transferred: { label: "Transferred", className: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
};

const StaffDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterService, setFilterService] = useState("");
  const [statusFilter, setStatusFilter] = useState("waiting");
  const [user, setUser] = useState(null);
  const [transferTarget, setTransferTarget] = useState("Finance");
  const [actionLoading, setActionLoading] = useState(false);
  const [allTickets, setAllTickets] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [staffNote, setStaffNote] = useState("");

  const pollingRef = useRef(null);
  const callStartRef = useRef(null);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const initUser = async () => {
      try {
        const me = await getCurrentUser();
        setUser(me.user || me);
      } catch (err) {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchTickets();
    fetchDashboardStats();
    pollingRef.current = setInterval(() => {
      fetchQueue();
      fetchTickets();
      fetchDashboardStats();
    }, 5000);
    return () => clearInterval(pollingRef.current);
  }, [filterService, statusFilter]);

  const fetchQueue = async () => {
    try {
      const data = await getWaitingTickets(token, filterService);
      setQueue(data || []);
    } catch (err) {
      console.warn("fetchQueue failed, using mock", err);
      setQueue([
        { _id: "local-1", ticketNumber: 101, studentName: "Local Student", serviceType: "Admissions", priority: false, status: "waiting" },
      ]);
    }
  };

  const fetchTickets = async () => {
    try {
      const data = await getAllTickets({ token, serviceType: filterService || undefined, status: statusFilter || undefined });
      setAllTickets(data || []);
    } catch (err) {
      console.warn("fetchTickets failed", err);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardStats(res.data?.data || null);
    } catch (err) {
      console.warn("fetchDashboardStats failed", err);
    }
  };

  const callNext = async () => {
    if (!queue.length || actionLoading) return;
    const next = queue[0];
    setCurrentTicket(next);
    setQueue((q) => q.slice(1));
    fetchTicketDetails(next._id);
    callStartRef.current = new Date();

    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/tickets/serve/${next._id}`,
        { counterId: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn("Call next API failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTicketDetails = async (id) => {
    try {
      const res = await getTicketById(id, token);
      setSelectedTicketDetails(res);
    } catch (err) {
      console.warn("ticket details fetch failed", err);
      setSelectedTicketDetails(null);
    }
  };

  const completeCurrent = async () => {
    if (!currentTicket || actionLoading) return;

    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/tickets/complete/${currentTicket._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      console.warn("complete ticket API failed");
    } finally {
      setActionLoading(false);
    }

    setCurrentTicket(null);
    setSelectedTicketDetails(null);
    fetchQueue();
  };

  const putOnHold = () => {
    if (!currentTicket) return;
    setQueue((q) => [...q, currentTicket]);
    setCurrentTicket(null);
  };

  const doStaffAction = async (action, payload) => {
    if (!selectedTicketDetails?.ticket) return;
    setLoading(true);
    try {
      const res = await staffAction(selectedTicketDetails.ticket._id, action, payload, token);
      setSelectedTicketDetails((s) => ({
        ...s,
        ticket: res.ticket,
        context: res.context || s.context,
      }));
      fetchQueue();
    } catch (err) {
      console.error("doStaffAction failed", err);
      alert("Action failed");
    } finally {
      setLoading(false);
    }
  };

  const doTransfer = async () => {
    if (!selectedTicketDetails?.ticket || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await transferTicket(selectedTicketDetails.ticket._id, transferTarget, token);
      setCurrentTicket(null);
      setSelectedTicketDetails(null);
      fetchQueue();
      alert(`Transferred to ${transferTarget} as Ticket #${res.newTicket?.ticketNumber || res.ticket?.ticketNumber}`);
    } catch (err) {
      console.error("doTransfer failed", err);
      alert("Transfer failed");
    } finally {
      setActionLoading(false);
    }
  };

  const stats = dashboardStats?.summary || {};
  const systemMetrics = dashboardStats?.metrics || {};
  const totalTicketsServed =
    systemMetrics.totalTicketsServed && systemMetrics.totalTicketsServed > 0
      ? systemMetrics.totalTicketsServed
      : dashboardStats?.tickets?.completed || 0;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await logoutUser();
                window.location.href = "/";
              }}
              className="text-red-600 font-semibold"
            >
              Logout
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Live Queue</h3>
            </div>

            <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="w-full border p-2 rounded mb-3">
              <option value="">All Services</option>
              <option>Admissions</option>
              <option>Finance</option>
              <option>Examinations</option>
              <option>Library</option>
              <option>Accommodation</option>
            </select>

            <div className="space-y-2 max-h-[48vh] overflow-auto">
              {!queue.length && (
                <div className="text-sm text-gray-500">No waiting tickets</div>
              )}

              {queue.map((t) => {
                const badge = STATUS_BADGE[t.status] || STATUS_BADGE.waiting;

                return (
                  <div
                    key={t._id}
                    className={`p-2 rounded border flex justify-between items-center ${
                      t.priority ? "bg-yellow-50 border-yellow-200" : ""
                    }`}
                  >
                    <div>
                      <div className="font-semibold">
                        #{t.ticketNumber} - {t.studentName || t.email}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{t.serviceType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentTicket(t);
                        fetchTicketDetails(t._id);
                      }}
                      className="text-sm text-blue-600"
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              disabled={actionLoading}
              onClick={callNext}
              className="mt-4 w-full bg-[#182B5C] text-white py-2 rounded"
            >
              {actionLoading ? "Calling..." : "Call Next"}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Current Student</h3>
            {selectedTicketDetails?.ticket ? (
              <>
                <div className="mb-2">
                  {(() => {
                    const t = selectedTicketDetails.ticket;
                    const badge = STATUS_BADGE[t.status] || STATUS_BADGE.waiting;

                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">
                            #{t.ticketNumber} - {t.studentName || t.email}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Service: {t.serviceType}</div>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 gap-2 mb-3">
                  {["finance", "academics", "examinations"].map((dept) => (
                    <div key={dept} className="p-2 border rounded">
                      <div className="text-xs text-gray-500">{dept.charAt(0).toUpperCase() + dept.slice(1)}</div>
                      <div className="font-medium">{selectedTicketDetails.context?.[dept]?.status || "-"}</div>
                      <div className="text-xs text-gray-500">{selectedTicketDetails.context?.[dept]?.note || ""}</div>
                      <button
                        onClick={() =>
                          doStaffAction(
                            dept === "finance"
                              ? "confirmPayment"
                              : dept === "academics"
                              ? "approveRegistration"
                              : "clearExamBlock",
                            { note: staffNote || `${dept} action performed` }
                          )
                        }
                        disabled={loading}
                        className="mt-2 text-sm text-green-600"
                      >
                        {dept === "finance"
                          ? "Confirm Payment"
                          : dept === "academics"
                          ? "Approve Registration"
                          : "Clear Exam Block"}
                      </button>
                    </div>
                  ))}
                </div>

                <textarea
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  placeholder="Service notes (optional)"
                  className="w-full border rounded p-2 text-sm mb-2"
                  rows={2}
                />

                <div className="flex gap-2 items-center mb-2 flex-wrap">
                  <button onClick={completeCurrent} disabled={actionLoading} className="flex-1 bg-[#182B5C] text-white py-2 rounded">
                    Complete
                  </button>
                  <button onClick={putOnHold} className="flex-1 bg-gray-200 py-2 rounded">
                    Hold
                  </button>
                  <button
                    onClick={() => doStaffAction("cancel", { note: staffNote || "Cancelled by staff" })}
                    className="flex-1 bg-red-100 text-red-700 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} className="flex-1 border p-2 rounded">
                    <option>Finance</option>
                    <option>Admissions</option>
                    <option>Examinations</option>
                    <option>Library</option>
                    <option>Accommodation</option>
                  </select>
                  <button onClick={doTransfer} disabled={actionLoading} className="flex-1 bg-[#D0B216] py-2 rounded">
                    Transfer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Select or call a student to view details.</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold">Performance Snapshot</h3>
            <div className="mt-3 text-center">
              <div className="text-sm text-gray-600">Tickets served today</div>
              <div className="font-bold text-2xl">{dashboardStats?.tickets?.completed || 0}</div>
              <div className="mt-3 text-sm text-gray-600">Average handling time</div>
              <div className="font-bold">{stats.avgServiceTime || 0} min</div>
              <div className="mt-3 text-sm text-gray-500">Peak hour: {dashboardStats?.peakHour || "-"}</div>
              <div className="mt-3 text-sm text-gray-500">Total tickets served: {totalTicketsServed}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Tickets View</h3>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border p-2 rounded">
                <option value="waiting">Waiting</option>
                <option value="serving">Serving</option>
                <option value="completed">Completed</option>
                <option value="transferred">Transferred</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allTickets.length === 0 && <div className="text-sm text-gray-500">No tickets</div>}
              {allTickets.map((t) => {
                const badge = STATUS_BADGE[t.status] || STATUS_BADGE.waiting;
                return (
                  <div key={t._id} className="border rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">#{t.ticketNumber} - {t.studentName || t.email}</div>
                      <div className="text-xs text-gray-500">{t.serviceType}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 lg:col-span-3">
            <h3 className="font-bold mb-2">Manual Registration & Quick Actions</h3>
            <ManualRegistration onRegistered={fetchQueue} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

const ManualRegistration = ({ onRegistered }) => {
  const [name, setName] = useState("");
  const [service, setService] = useState("Admissions");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");

  const register = async () => {
    if (!name) return alert("Please enter name");
    try {
      await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceType: service, studentName: name, email: `${name.replace(/\s+/g, "").toLowerCase()}@example.edu` }),
      });
      setName("");
      onRegistered && onRegistered();
    } catch (err) {
      console.error(err);
      alert("Failed to register");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" className="border p-2 rounded" />
      <select value={service} onChange={(e) => setService(e.target.value)} className="border p-2 rounded">
        <option>Admissions</option>
        <option>Finance</option>
        <option>Library</option>
        <option>Examinations</option>
        <option>Accommodation</option>
      </select>
      <button onClick={register} className="bg-[#D0B216] py-2 rounded">Register</button>
    </div>
  );
};

export default StaffDashboard;
