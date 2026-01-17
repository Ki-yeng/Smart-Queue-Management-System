import React, { useState, useEffect } from "react";
import { createTicket, getNextTicket } from "../services/ticketService";
// Sidebar removed: student dashboard should render full-width without sidebar
import { getCurrentUser } from "../services/authService";

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

const CustomerPage = () => {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [user, setUser] = useState(null);

  // Clearance statuses (root-cause checks) - fallback values
  const [clearance, setClearance] = useState({
    finance: { status: "Pending", note: "Outstanding balance" },
    academics: { status: "Registered", note: "All units ok" },
    examinations: { status: "Blocked", note: "Fees unpaid" },
    library: { status: "Cleared", note: "No returns" },
  });

  // Smart action state
  const [selectedAction, setSelectedAction] = useState(SMART_ACTIONS[0]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);

  // Central queue (lightweight overview)
  const [central, setCentral] = useState(null);

  // Self-service uploads (user must submit each file individually)
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setAnnouncementIndex((i) => (i + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        if (me) setUser(me.user || me);
      } catch (err) {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    })();

    // try to fetch a lightweight central overview (non-blocking)
    (async () => {
      try {
        const res = await fetch("/api/dashboard").then((r) => r.json()).catch(() => null);
        setCentral(res);
      } catch (err) {
        setCentral(null);
      }
    })();
  }, []);

  const smartRouteForAction = (actionId) => {
    const a = SMART_ACTIONS.find((s) => s.id === actionId) || SMART_ACTIONS[0];
    // basic prerequisites based on `clearance`
    if (a.dept === "Examinations") {
      const allowed = clearance.finance?.status === "Paid";
      return { ...a, allowed, reason: allowed ? null : "Resolve fees first" };
    }
    if (a.dept === "Finance") {
      return { ...a, allowed: true };
    }
    if (a.dept === "Academics") {
      const allowed = clearance.academics?.status !== "Registered" ? true : false;
      return { ...a, allowed, reason: allowed ? null : "Already registered" };
    }
    return { ...a, allowed: true };
  };

  const handleSelectAction = (action) => setSelectedAction(action);

  const handleGenerateTicket = async () => {
    setLoading(true);
    try {
      const data = await createTicket(serviceType);
      setTicket(data.ticket);

      const next = await getNextTicket(serviceType);

      if (next?.ticketNumber) {
        const ahead = Math.max(
          next.ticketNumber - data.ticket.ticketNumber,
          0
        );
        setPeopleAhead(ahead);
        setEstimatedWait(ahead * 5);
      } else {
        setPeopleAhead(0);
        setEstimatedWait(0);
      }
    } catch (err) {
      console.error("Ticket error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => ({ file: f, name: f.name, size: f.size, status: "local" }));
    setUploads((u) => [...mapped, ...u]);
  };

  const submitSingleUpload = async (index) => {
    const item = uploads[index];
    if (!item) return;
    // placeholder: simulate upload then mark accepted
    try {
      // TODO: replace with real upload API call
      await new Promise((r) => setTimeout(r, 700));
      setUploads((u) => u.map((it, i) => (i === index ? { ...it, status: "submitted" } : it)));
      alert(`${item.name} submitted`);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Topbar / SSO header */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#182B5C] text-white flex items-center justify-center text-lg font-bold">{user?.name?.[0] || "S"}</div>
              <div>
                <div className="text-lg font-bold">{user?.name || "Student Name"}</div>
                <div className="text-sm text-gray-500">{user?.email || "regno@example.edu"}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 rounded-full bg-green-100 text-green-800">✔ Cleared</div>
              <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.reload(); }} className="text-sm text-red-600 font-semibold">Logout</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clearance Panel */}
            <div className="col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-xl mb-3">My Clearance Status</h3>
                <div className="space-y-3">
                  {Object.entries(clearance).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b py-2">
                      <div>
                        <div className="font-semibold capitalize">{k}</div>
                        <div className="text-sm text-gray-500">{v.note}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${v.status === 'Cleared' ? 'text-green-600' : v.status === 'Blocked' ? 'text-red-600' : 'text-yellow-600'}`}>{v.status}</div>
                        <button className="mt-2 text-sm text-blue-600">Resolve Now</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-xl mb-3">Smart Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SMART_ACTIONS.map((c) => {
                    const route = smartRouteForAction(c.id);
                    const blocked = !route.allowed;
                    return (
                      <button key={c.id} onClick={() => handleSelectAction(c)} title={blocked ? route.reason : ''} className={`p-3 rounded-lg text-left border ${selectedAction.id === c.id ? 'border-[#182B5C] bg-[#F7F9FF]' : 'bg-white'} ${blocked ? 'opacity-60' : 'hover:shadow-lg'}`}>
                        <div className="font-bold">{c.title}</div>
                        <div className="text-sm text-gray-500">Routes to: <span className="font-semibold">{route.dept}</span></div>
                        {blocked && <div className="text-xs text-red-600 mt-1">Blocked: {route.reason}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-xl mb-3">Self-Service & Uploads</h3>
                <input type="file" multiple onChange={handleFiles} className="mb-3" />
                <div className="space-y-2">
                  {uploads.length === 0 ? (
                    <div className="text-sm text-gray-500">No uploads yet. Submit each file individually.</div>
                  ) : (
                    uploads.map((f, i) => (
                      <div key={i} className="flex items-center justify-between border rounded p-2">
                        <div>
                          <div className="font-semibold">{f.name}</div>
                          <div className="text-xs text-gray-500">{Math.round(f.size/1024)} KB</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => submitSingleUpload(i)} disabled={f.status === 'submitted'} className="text-sm text-blue-600">{f.status === 'submitted' ? 'Submitted' : 'Submit'}</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Central overview + join panel */}
            <div className="col-span-1 lg:col-span-1">
              <div className="bg-white rounded-xl shadow p-4 mb-6">
                <h3 className="font-bold text-xl mb-3">Central Queue Overview</h3>
                {central ? (
                  <div className="space-y-3">
                    {(central.ticketsPerService || []).map((t) => (
                      <div key={t._id} className="flex items-center justify-between">
                        <div className="font-medium">{t._id}</div>
                        <div className="text-sm text-gray-600">{t.count} waiting</div>
                      </div>
                    ))}
                    <div className="text-sm text-gray-500">Active counters: {central.activeCounters}</div>
                    <div className="text-sm text-gray-500">Avg wait: {central.avgWaitingTimeMinutes} mins</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Queue data loading or unavailable.</div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-xl mb-3">{selectedAction.title}</h3>
                <div className="text-sm text-gray-600 mb-3">Routes to: <span className="font-semibold">{smartRouteForAction(selectedAction.id).dept}</span></div>
                <button onClick={handleGenerateTicket} disabled={loadingTicket || !smartRouteForAction(selectedAction.id).allowed} className={`w-full py-3 rounded-lg font-bold ${loadingTicket ? 'bg-gray-300' : 'bg-[#182B5C] text-white'}`}>
                  {loadingTicket ? 'Joining...' : `Join ${smartRouteForAction(selectedAction.id).dept} Queue`}
                </button>

                {ticketInfo && (
                  <div className="mt-4 p-3 bg-[#F7F9FF] rounded">
                    <div className="font-bold">Ticket #{ticketInfo.ticketNumber || ticketInfo._id}</div>
                    <div className="text-sm text-gray-600">People ahead: {ticketInfo.peopleAhead ?? '—'}</div>
                    <div className="text-sm text-gray-600">Estimated wait: {ticketInfo.estimatedWait ?? '—'} mins</div>
                  </div>
                )}
              </div>
            </div>

            {/* Announcements / History */}
            <div className="col-span-1">
              <div className="bg-white rounded-xl shadow p-4 mb-6">
                <h3 className="font-bold text-xl mb-3">Announcements</h3>
                <div className="p-4 bg-[#182B5C]/5 rounded text-center font-medium text-[#182B5C]">{announcements[announcementIndex]}</div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-xl mb-3">Ticket History</h3>
                <div className="text-sm text-gray-500">Recent tickets will appear here once you join queues.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default CustomerPage;
