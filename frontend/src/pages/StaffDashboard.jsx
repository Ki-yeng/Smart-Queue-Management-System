import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "../components/sidebarLayout";
import {
  getWaitingTickets,
  getTicketById,
  staffAction,
  transferTicket,
} from "../services/ticketService";
import { getCurrentUser } from "../services/authService";
import axios from "axios";

const StaffDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState(null);
  const [ticketsServed, setTicketsServed] = useState(0);
  const [serviceTimes, setServiceTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterService, setFilterService] = useState("");
  const [user, setUser] = useState(null);
  const [transferTarget, setTransferTarget] = useState("Finance");
  const [actionLoading, setActionLoading] = useState(false);

  const pollingRef = useRef(null);
  const callStartRef = useRef(null);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Load current user
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

  // Polling queue
  useEffect(() => {
    fetchQueue();
    pollingRef.current = setInterval(fetchQueue, 5000);
    return () => clearInterval(pollingRef.current);
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await getWaitingTickets(token, filterService);
      const filtered = (data || []).filter((t) => !(t.metadata?.blocked));
      filtered.sort((a, b) => (b.priority === true) - (a.priority === true));
      setQueue(filtered);
    } catch (err) {
      console.warn("fetchQueue failed, using mock", err);
      setQueue([
        { _id: "local-1", ticketNumber: 101, studentName: "Local Student", serviceType: "Admissions", priority: false },
      ]);
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
      await axios.put(`${API_URL}/api/tickets/serve/${next._id}`, { counterId: null }, { headers: { Authorization: `Bearer ${token}` } });
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

    const elapsed = callStartRef.current ? Math.round((new Date() - callStartRef.current) / 60000) : 5;
    setServiceTimes((t) => [...t, elapsed]);
    setTicketsServed((s) => s + 1);

    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/api/tickets/complete/${currentTicket._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
      alert(`Transferred to ${transferTarget} as Ticket #${res.ticket.ticketNumber}`);
    } catch (err) {
      console.error("doTransfer failed", err);
      alert("Transfer failed");
    } finally {
      setActionLoading(false);
    }
  };

  const avgTime = serviceTimes.length ? Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length) : 0;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Live Queue */}
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
              {!queue.length && <div className="text-sm text-gray-500">No waiting tickets</div>}
              {queue.map((t) => (
                <div key={t._id} className={`p-2 rounded border flex justify-between items-center ${t.priority ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                  <div>
                    <div className="font-semibold">#{t.ticketNumber} — {t.studentName || t.email}</div>
                    <div className="text-xs text-gray-500">{t.serviceType}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentTicket(t); fetchTicketDetails(t._id); }} className="text-sm text-blue-600">Open</button>
                  </div>
                </div>
              ))}
            </div>

            <button disabled={actionLoading} onClick={callNext} className="mt-4 w-full bg-[#182B5C] text-white py-2 rounded">{actionLoading ? 'Calling...' : 'Call Next'}</button>
          </div>

          {/* Current Student */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Current Student</h3>
            {selectedTicketDetails?.ticket ? (
              <>
                <div className="mb-2">
                  <div className="font-semibold">#{selectedTicketDetails.ticket.ticketNumber} — {selectedTicketDetails.ticket.studentName || selectedTicketDetails.ticket.email}</div>
                  <div className="text-sm text-gray-500">Service: {selectedTicketDetails.ticket.serviceType}</div>
                </div>

                <div className="grid grid-cols-1 gap-2 mb-3">
                  {['finance','academics','examinations'].map((dept) => (
                    <div key={dept} className="p-2 border rounded">
                      <div className="text-xs text-gray-500">{dept.charAt(0).toUpperCase()+dept.slice(1)}</div>
                      <div className="font-medium">{selectedTicketDetails.context?.[dept]?.status || '—'}</div>
                      <div className="text-xs text-gray-500">{selectedTicketDetails.context?.[dept]?.note || ''}</div>
                      <button
                        onClick={() => doStaffAction(
                          dept==='finance'?'confirmPayment':dept==='academics'?'approveRegistration':'clearExamBlock',
                          { note: `${dept} action performed` }
                        )}
                        disabled={loading}
                        className="mt-2 text-sm text-green-600"
                      >
                        {dept==='finance'?'Confirm Payment':dept==='academics'?'Approve Registration':'Clear Exam Block'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-center mb-2">
                  <button onClick={completeCurrent} disabled={actionLoading} className="flex-1 bg-[#182B5C] text-white py-2 rounded">Complete</button>
                  <button onClick={putOnHold} className="flex-1 bg-gray-200 py-2 rounded">Hold</button>
                  <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} className="flex-1 border p-2 rounded">
                    <option>Finance</option>
                    <option>Admissions</option>
                    <option>Examinations</option>
                    <option>Library</option>
                    <option>Accommodation</option>
                  </select>
                  <button onClick={doTransfer} disabled={actionLoading} className="flex-1 bg-[#D0B216] py-2 rounded">Transfer</button>
                </div>
              </>
            ) : <div className="text-sm text-gray-500">Select or call a student to view details.</div>}
          </div>

          {/* Performance Snapshot */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold">Performance Snapshot</h3>
            <div className="mt-3 text-center">
              <div className="text-sm text-gray-600">Tickets served today</div>
              <div className="font-bold text-2xl">{ticketsServed}</div>
              <div className="mt-3 text-sm text-gray-600">Average handling time</div>
              <div className="font-bold">{avgTime} min</div>
              <div className="mt-3 text-sm text-gray-500">Bottlenecks detected: {queue.length > 10 ? 'High load' : '—'}</div>
            </div>
          </div>

          {/* Manual Registration */}
          <div className="bg-white rounded-xl shadow p-4 lg:col-span-3">
            <h3 className="font-bold mb-2">Manual Registration & Quick Actions</h3>
            <ManualRegistration onRegistered={fetchQueue} />
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
};

// Manual Registration Component
const ManualRegistration = ({ onRegistered }) => {
  const [name, setName] = useState("");
  const [service, setService] = useState("Admissions");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");

  const register = async () => {
    if (!name) return alert("Please enter name");
    try {
      await fetch(`${API_URL}/api/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceType: service, studentName: name, email: `${name.replace(/\s+/g,'').toLowerCase()}@example.edu` })
      });
      setName("");
      onRegistered && onRegistered();
    } catch (err) {
      console.error(err);
      alert('Failed to register');
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
