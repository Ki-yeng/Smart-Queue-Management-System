import React, { useEffect, useRef, useState } from "react";
import SidebarLayout from "../components/sidebarLayout";
import { useSocket } from "../hooks/useSocket";
import {
  getAllTickets,
  getTicketById,
  getWaitingTickets,
  staffAction,
  transferTicket,
} from "../services/ticketService";
import {
  approveLibraryClearance,
  approveSecurityGraduationClearance,
  automatePasswordReset,
  confirmHostelClearance,
  getBookReturnStatus,
  getEmailActivationStatus,
  getFeeBalance,
  getICTIdCardStatus,
  getLibraryFineBalance,
  getOfficeTransactions,
  getRoomAllocation,
  getSecurityIdCardProduction,
  getUnifiedProfile,
  lookupAcademicStatus,
  generateExamCard,
  requestTranscript,
  trackGraduationClearance,
  verifyFeeClearance,
  verifyHostelPayment,
  verifyUnitRegistration,
} from "../services/officeService";
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

const sameId = (a, b) => String(a || "") === String(b || "");

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
  const [socketState, setSocketState] = useState("connecting");
  const [officeActionLoading, setOfficeActionLoading] = useState(false);
  const [integrationTargetId, setIntegrationTargetId] = useState("");
  const [integrationResult, setIntegrationResult] = useState(null);
  const [integrationError, setIntegrationError] = useState("");
  const [integrationProfile, setIntegrationProfile] = useState(null);
  const [integrationTransactions, setIntegrationTransactions] = useState([]);
  const [queueError, setQueueError] = useState("");
  const [activeServingTicketId, setActiveServingTicketId] = useState(null);

  const pollingRef = useRef(null);
  const callStartRef = useRef(null);
  const socket = useSocket();

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
    const restoreServingTicket = async () => {
      if (!user || !token) return;
      try {
        const servingTickets = await getAllTickets({ token, status: "serving" });
        if (!Array.isArray(servingTickets) || servingTickets.length === 0) return;

        const myId = user?._id || user?.id;
        const mine = servingTickets.find((t) => sameId(t.servedBy, myId));
        const candidate = mine || servingTickets[0];
        if (!candidate?._id) return;

        setCurrentTicket(candidate);
        setActiveServingTicketId(candidate._id);
        fetchTicketDetails(candidate._id);
      } catch (err) {
        console.warn("Failed to restore serving ticket", err);
      }
    };

    restoreServingTicket();
  }, [user, token]);

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

  useEffect(() => {
    const onConnect = () => setSocketState("connected");
    const onDisconnect = () => setSocketState("disconnected");
    const onConnectError = () => setSocketState("error");
    const onRealtimeUpdate = () => {
      fetchQueue();
      fetchTickets();
      fetchDashboardStats();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("ticketCreated", onRealtimeUpdate);
    socket.on("ticketServing", onRealtimeUpdate);
    socket.on("ticketCompleted", onRealtimeUpdate);
    socket.on("ticketCancelled", onRealtimeUpdate);
    socket.on("ticketTransferred", onRealtimeUpdate);
    socket.on("queueUpdated", onRealtimeUpdate);

    if (socket.connected) {
      setSocketState("connected");
    } else {
      setSocketState("connecting");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("ticketCreated", onRealtimeUpdate);
      socket.off("ticketServing", onRealtimeUpdate);
      socket.off("ticketCompleted", onRealtimeUpdate);
      socket.off("ticketCancelled", onRealtimeUpdate);
      socket.off("ticketTransferred", onRealtimeUpdate);
      socket.off("queueUpdated", onRealtimeUpdate);
    };
  }, [socket, filterService, statusFilter]);

  const fetchQueue = async () => {
    try {
      setQueueError("");
      const data = await getWaitingTickets(token, filterService);
      setQueue(data || []);
    } catch (err) {
      console.warn("fetchQueue failed", err);
      setQueueError(err?.response?.data?.message || "Failed to load live queue");
      setQueue([]);
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
    if (activeServingTicketId) {
      alert("Complete, transfer, cancel, or put the current serving ticket on hold before calling next.");
      return;
    }
    if (!queue.length || actionLoading) return;
    const next = queue[0];

    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/tickets/serve/${next._id}`,
        { counterId: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const servedTicket = res?.data?.ticket || next;
      setCurrentTicket(servedTicket);
      setActiveServingTicketId(servedTicket._id || next._id);
      setQueue((q) => q.slice(1));
      fetchTicketDetails(next._id);
      callStartRef.current = new Date();
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
    setActiveServingTicketId(null);
    setSelectedTicketDetails(null);
    fetchQueue();
  };

  const putOnHold = async () => {
    if (!currentTicket || actionLoading) return;
    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/tickets/hold/${currentTicket._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentTicket(null);
      setActiveServingTicketId(null);
      setSelectedTicketDetails(null);
      fetchQueue();
      fetchTickets();
    } catch (err) {
      console.warn("hold ticket API failed", err);
      alert(err?.response?.data?.message || "Failed to put ticket on hold");
    } finally {
      setActionLoading(false);
    }
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
      if (
        (action === "cancel" || action === "complete") &&
        selectedTicketDetails.ticket._id === activeServingTicketId
      ) {
        setActiveServingTicketId(null);
        setCurrentTicket(null);
      }
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
      if (selectedTicketDetails.ticket._id === activeServingTicketId) {
        setActiveServingTicketId(null);
      }
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

  const resumeServingTicket = async (ticket) => {
    if (!ticket?._id) return;
    if (activeServingTicketId && !sameId(activeServingTicketId, ticket._id)) {
      alert("Resolve your current serving ticket first.");
      return;
    }
    setCurrentTicket(ticket);
    setActiveServingTicketId(ticket._id);
    await fetchTicketDetails(ticket._id);
  };

  const holdSpecificTicket = async (ticket) => {
    if (!ticket?._id || actionLoading) return;
    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/tickets/hold/${ticket._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (sameId(activeServingTicketId, ticket._id)) {
        setCurrentTicket(null);
        setActiveServingTicketId(null);
        setSelectedTicketDetails(null);
      }
      fetchQueue();
      fetchTickets();
    } catch (err) {
      console.warn("hold specific ticket API failed", err);
      alert(err?.response?.data?.message || "Failed to put ticket on hold");
    } finally {
      setActionLoading(false);
    }
  };

  const retrieveHeldTicket = async (ticket) => {
    if (!ticket?._id || actionLoading) return;
    if (ticket.status !== "on_hold") {
      alert("Only on-hold tickets can be retrieved.");
      return;
    }
    if (activeServingTicketId) {
      alert("Resolve current serving ticket before retrieving another one.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/tickets/serve/${ticket._id}`,
        { counterId: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const servedTicket = res?.data?.ticket || ticket;
      setCurrentTicket(servedTicket);
      setActiveServingTicketId(servedTicket._id || ticket._id);
      await fetchTicketDetails(ticket._id);
      fetchQueue();
      fetchTickets();
    } catch (err) {
      console.error("retrieve held ticket failed", err);
      alert(err?.response?.data?.message || "Failed to retrieve held ticket");
    } finally {
      setActionLoading(false);
    }
  };

  const currentUserId =
    selectedTicketDetails?.ticket?.userId?._id ||
    selectedTicketDetails?.ticket?.userId ||
    null;

  useEffect(() => {
    if (currentUserId) {
      setIntegrationTargetId(String(currentUserId));
    }
  }, [currentUserId]);

  const runOfficeAction = async (operation) => {
    const targetUserId = integrationTargetId || currentUserId;
    if (!targetUserId || officeActionLoading) return;

    setIntegrationError("");
    setOfficeActionLoading(true);
    try {
      let result;
      if (operation === "transcript") {
        result = await requestTranscript({ userId: targetUserId, reason: staffNote || "Requested by staff" }, token);
      } else if (operation === "examCard") {
        result = await generateExamCard(targetUserId, token);
      } else if (operation === "passwordReset") {
        result = await automatePasswordReset(targetUserId, token);
      } else if (operation === "libraryClearance") {
        result = await approveLibraryClearance(targetUserId, token);
      } else if (operation === "hostelClearance") {
        result = await confirmHostelClearance(targetUserId, token);
      } else if (operation === "securityClearance") {
        result = await approveSecurityGraduationClearance(targetUserId, token);
      } else if (operation === "feeBalance") {
        result = await getFeeBalance(targetUserId, token);
      } else if (operation === "feeVerify") {
        result = await verifyFeeClearance(targetUserId, token);
      } else if (operation === "unitVerify") {
        result = await verifyUnitRegistration(targetUserId, token);
      } else if (operation === "graduationTrack") {
        result = await trackGraduationClearance(targetUserId, token);
      } else if (operation === "academicStatus") {
        result = await lookupAcademicStatus(targetUserId, token);
      } else if (operation === "libraryFine") {
        result = await getLibraryFineBalance(targetUserId, token);
      } else if (operation === "bookReturn") {
        result = await getBookReturnStatus(targetUserId, token);
      } else if (operation === "roomAllocation") {
        result = await getRoomAllocation(targetUserId, token);
      } else if (operation === "hostelPayment") {
        result = await verifyHostelPayment(targetUserId, token);
      } else if (operation === "ictIdCard") {
        result = await getICTIdCardStatus(targetUserId, token);
      } else if (operation === "emailActivation") {
        result = await getEmailActivationStatus(targetUserId, token);
      } else if (operation === "securityCardProd") {
        result = await getSecurityIdCardProduction(targetUserId, token);
      }

      if (result) {
        setIntegrationResult(result);
      }

      if (selectedTicketDetails?.ticket?._id) {
        fetchTicketDetails(selectedTicketDetails.ticket._id);
      }
    } catch (err) {
      console.error("Office action failed", err);
      setIntegrationError(err?.response?.data?.message || "Office action failed");
    } finally {
      setOfficeActionLoading(false);
    }
  };

  const loadIntegrationProfile = async () => {
    const targetUserId = integrationTargetId || currentUserId;
    if (!targetUserId) return;
    setIntegrationError("");
    setOfficeActionLoading(true);
    try {
      const [profile, transactions] = await Promise.all([
        getUnifiedProfile(targetUserId, token),
        getOfficeTransactions(targetUserId, token, 15),
      ]);
      setIntegrationProfile(profile);
      setIntegrationTransactions(Array.isArray(transactions) ? transactions : []);
      setIntegrationResult({ profileLoaded: true, transactionCount: (transactions || []).length });
    } catch (err) {
      console.error("Failed to load profile/transactions", err);
      setIntegrationError(err?.response?.data?.message || "Failed to load profile/transactions");
    } finally {
      setOfficeActionLoading(false);
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
            <div className="mr-3 flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  socketState === "connected"
                    ? "bg-green-100 text-green-700"
                    : socketState === "connecting"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Socket: {socketState}
              </span>
              {socketState !== "connected" && (
                <button
                  type="button"
                  onClick={() => socket.connect()}
                  className="text-xs border border-gray-300 px-2 py-1 rounded"
                >
                  Reconnect
                </button>
              )}
            </div>
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
              {queueError && <div className="text-sm text-red-600">{queueError}</div>}
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
              disabled={actionLoading || Boolean(activeServingTicketId)}
              onClick={callNext}
              className="mt-4 w-full bg-[#182B5C] text-white py-2 rounded"
            >
              {actionLoading ? "Calling..." : activeServingTicketId ? "Resolve Current Ticket First" : "Call Next"}
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
                <option value="on_hold">On Hold</option>
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
                    <div className="flex items-center gap-2">
                      {t.status === "serving" && (
                        <>
                          <button
                            onClick={() => resumeServingTicket(t)}
                            disabled={actionLoading}
                            className="text-xs border border-indigo-300 text-indigo-700 px-2 py-1 rounded disabled:opacity-50"
                          >
                            Resume
                          </button>
                          <button
                            onClick={() => holdSpecificTicket(t)}
                            disabled={actionLoading}
                            className="text-xs border border-amber-300 text-amber-700 px-2 py-1 rounded disabled:opacity-50"
                          >
                            Put On Hold
                          </button>
                        </>
                      )}
                      {t.status === "on_hold" && (
                        <button
                          onClick={() => retrieveHeldTicket(t)}
                          disabled={actionLoading || Boolean(activeServingTicketId)}
                          className="text-xs border border-blue-300 text-blue-700 px-2 py-1 rounded disabled:opacity-50"
                        >
                          Retrieve
                        </button>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 lg:col-span-3">
            <h3 className="font-bold mb-3">Office Integration Center</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                value={integrationTargetId}
                onChange={(e) => setIntegrationTargetId(e.target.value)}
                placeholder="Target User ID"
                className="border p-2 rounded md:col-span-2"
              />
              <button
                type="button"
                onClick={loadIntegrationProfile}
                disabled={officeActionLoading || !integrationTargetId}
                className="border rounded px-3 py-2"
              >
                Load Profile & Transactions
              </button>
              <button
                type="button"
                onClick={() => setIntegrationResult(null)}
                className="border rounded px-3 py-2"
              >
                Clear Result
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              <button onClick={() => runOfficeAction("feeBalance")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Fee Balance</button>
              <button onClick={() => runOfficeAction("feeVerify")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Verify Fee Clearance</button>
              <button onClick={() => runOfficeAction("transcript")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Transcript Request</button>
              <button onClick={() => runOfficeAction("examCard")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Generate Exam Card</button>
              <button onClick={() => runOfficeAction("unitVerify")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Verify Unit Reg</button>
              <button onClick={() => runOfficeAction("graduationTrack")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Track Graduation</button>
              <button onClick={() => runOfficeAction("academicStatus")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Academic Status</button>
              <button onClick={() => runOfficeAction("passwordReset")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">ICT Password Reset</button>
              <button onClick={() => runOfficeAction("ictIdCard")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">ICT ID Status</button>
              <button onClick={() => runOfficeAction("emailActivation")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Email Activation</button>
              <button onClick={() => runOfficeAction("libraryFine")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Library Fine</button>
              <button onClick={() => runOfficeAction("bookReturn")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Book Return</button>
              <button onClick={() => runOfficeAction("libraryClearance")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Library Clearance</button>
              <button onClick={() => runOfficeAction("roomAllocation")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Room Allocation</button>
              <button onClick={() => runOfficeAction("hostelPayment")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Hostel Payment</button>
              <button onClick={() => runOfficeAction("hostelClearance")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Hostel Clearance</button>
              <button onClick={() => runOfficeAction("securityCardProd")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Security ID Prod</button>
              <button onClick={() => runOfficeAction("securityClearance")} disabled={officeActionLoading || !integrationTargetId} className="border rounded p-2 text-xs">Security Clearance</button>
            </div>

            {integrationError && <div className="text-sm text-red-600 mb-2">{integrationError}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="border rounded p-3 bg-slate-50">
                <div className="font-semibold text-sm mb-2">Unified Profile</div>
                <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(integrationProfile || {}, null, 2)}</pre>
              </div>
              <div className="border rounded p-3 bg-slate-50">
                <div className="font-semibold text-sm mb-2">Recent Transactions</div>
                <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(integrationTransactions || [], null, 2)}</pre>
              </div>
            </div>

            <div className="border rounded p-3 bg-slate-50 mt-3">
              <div className="font-semibold text-sm mb-2">Last Operation Result</div>
              <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(integrationResult || {}, null, 2)}</pre>
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
