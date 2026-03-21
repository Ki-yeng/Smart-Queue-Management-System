import React, { useEffect, useRef, useState } from "react";
import {
  cancelTicket,
  checkInTicket,
  createTicket,
  getLatestTicket,
  getNextTicket,
  getQueueOverview,
  getUserTickets,
} from "../services/ticketService";
import { getCurrentUser } from "../services/authService";
import { getUserUploads, uploadDocuments } from "../services/uploadService";
import { getClearanceStatus } from "../services/clearanceService";
import { getMyFeedback, submitFeedback } from "../services/feedbackService";
import {
  cancelAppointment,
  createAppointment,
  getMyAppointments,
  joinQueueFromAppointment,
} from "../services/appointmentService";
import ClearanceStatus from "../components/ClearanceStatus";
import io from "socket.io-client";

const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "#facc15" },
  serving: { label: "Serving", color: "#3b82f6" },
  completed: { label: "Completed", color: "#22c55e" },
  transferred: { label: "Transferred", color: "#a855f7" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  no_show: { label: "No Show", color: "#dc2626" },
};

const announcements = [
  "Admissions office closes at 4:30 PM today",
  "Carry your student ID for all services",
  "Library clearance ongoing this week",
  "Most services are available via the student portal",
];

const SMART_ACTIONS = [
  { id: "exam_block", title: "Clear Exam Block" },
  { id: "fee_balance", title: "Resolve Fee Balance" },
  { id: "register_units", title: "Register Units" },
];

const SMART_ROUTING = {
  exam_block: "Examinations",
  fee_balance: "Finance",
  register_units: "Student Records",
};

const DEPARTMENT_TO_ACTION = {
  finance: "fee_balance",
  examinations: "exam_block",
  academics: "register_units",
};

const SERVICE_OPTIONS = [
  "Admissions",
  "Finance",
  "Examinations",
  "Student Records",
  "Registry",
  "Library",
  "Accommodation",
  "ICT Support",
  "Counselling",
  "General Enquiries",
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getUserId = (user) => user?._id || user?.id || null;

const getRegistrationNo = (user) =>
  user?.registrationNumber ||
  user?.studentNumber ||
  user?.regNo ||
  user?.regNumber ||
  user?.registrationNo ||
  "";

const getProgram = (user) => user?.program || user?.course || user?.department || "";

const getYear = (user) => user?.studentYear || user?.year || user?.yearOfStudy || "";

const getQueueDisplayStatus = (status) => (status === "open" ? "active" : "closed");
const CLEAR_STATUSES = ["CLEARED", "PAID", "APPROVED"];
const SERVICE_TO_CLEARANCE_KEY = {
  Finance: "finance",
  Examinations: "examinations",
  "Student Records": "academics",
  Library: "library",
  Accommodation: "hostel",
  "ICT Support": "ict",
};

const applyQueueMetrics = (ticketData, overview) => {
  if (!ticketData) return ticketData;
  const service = (overview || []).find((q) => q.serviceType === ticketData.serviceType);
  if (!service) return ticketData;

  const waiting = Number(service.waiting || 0);
  const peopleAhead = Math.max(waiting - 1, 0);
  return {
    ...ticketData,
    peopleAhead,
    estimatedWait: Number(service.estimatedWaitMins || peopleAhead * 5),
  };
};

const CustomerPage = () => {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [ticketStatus, setTicketStatus] = useState("");
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nearTurnAlert, setNearTurnAlert] = useState("");
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [notifPopupMessage, setNotifPopupMessage] = useState("");
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [clearance, setClearance] = useState({});
  const [selectedAction, setSelectedAction] = useState(SMART_ACTIONS[0]);
  const [queueOverview, setQueueOverview] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bookingServiceType, setBookingServiceType] = useState("Finance");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [isVipRequest, setIsVipRequest] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "feedback",
    rating: 5,
    category: "general",
    ticketId: "",
    message: "",
    priority: "medium",
  });

  const socketRef = useRef(null);
  const notificationsEndRef = useRef(null);
  const ticketPanelRef = useRef(null);
  const token = localStorage.getItem("token");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        window.location.href = "/";
        return;
      }
      try {
        const me = await getCurrentUser();
        const resolved = me?.user || me;
        if (resolved) {
          setUser(resolved);
        } else {
          const stored = localStorage.getItem("user");
          if (stored) setUser(JSON.parse(stored));
        }
        setAuthChecked(true);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.clear();
          window.location.href = "/";
          return;
        }
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
        setAuthChecked(true);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    const userId = getUserId(user);
    if (!userId) return;

    (async () => {
      try {
        const data = await getClearanceStatus(userId, token);
        setClearance(data || {});
      } catch (err) {
        console.warn("Clearance fetch failed", err);
        setClearance({});
      }
    })();
  }, [user, token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getMyFeedback(token, 10);
        setFeedbackList(data || []);
      } catch (err) {
        console.warn("Feedback fetch failed", err);
        setFeedbackList([]);
      }
    })();
  }, [token, ticketHistory.length]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getMyAppointments(token);
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Appointments fetch failed", err);
        setAppointments([]);
      }
    })();
  }, [token, ticketStatus]);

  useEffect(() => {
    if (!user) return;
    const userId = getUserId(user);
    if (!userId) return;

    (async () => {
      try {
        const latest = await getLatestTicket(userId, token);
        if (latest && latest.status !== "completed" && latest.status !== "cancelled") {
          setTicket(latest);
          setTicketStatus(latest.status);
        } else {
          setTicket(null);
          setTicketStatus("");
        }
      } catch (err) {
        console.warn("Latest ticket fetch failed", err);
      }
    })();
  }, [user, token]);

  useEffect(() => {
    if (!ticket || !user) return;
    const userId = getUserId(user);
    if (!userId) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getLatestTicket(userId, token);
        if (!updated || updated.status === "completed" || updated.status === "cancelled") {
          setTicket(null);
          setTicketStatus("");
          return;
        }
        setTicket(updated);
        setTicketStatus(updated.status);
      } catch (err) {
        console.warn("Ticket polling failed", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ticket, user, token]);

  useEffect(() => {
    if (!user) return;
    const userId = getUserId(user);
    if (!userId) return;

    socketRef.current = io(API_URL, { auth: { token } });

    socketRef.current.on("ticketStatusUpdate", (data) => {
      if (String(data.userId) !== String(userId)) return;
      setTicketStatus(data.status);
      setNotifications((prev) => [
        {
          message: `Ticket #${data.ticketNumber} status updated: ${data.status}`,
          time: new Date(),
        },
        ...prev,
      ]);
    });

    socketRef.current.on("nearTurnNotification", (data) => {
      setNearTurnAlert(data?.message || "Your turn is near.");
      setNotifications((prev) => [{ message: data?.message || "Your turn is near.", time: new Date() }, ...prev]);
      if (data?.ticketId && ticket && String(ticket._id) === String(data.ticketId)) {
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                checkInRequired: Boolean(data.checkInRequired),
              }
            : prev
        );
      }
    });

    socketRef.current.on("ticketNoShow", (data) => {
      setNotifications((prev) => [{ message: data?.message || "Ticket marked as no-show", time: new Date() }, ...prev]);
      setTicketStatus("no_show");
      setTicket((prev) => (prev ? { ...prev, status: "no_show" } : prev));
    });

    return () => socketRef.current && socketRef.current.disconnect();
  }, [user, token]);

  useEffect(() => {
    notificationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notifications]);

  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    setNotifPopupMessage(latest?.message || "New notification");
    setShowNotifPopup(true);
    const t = setTimeout(() => setShowNotifPopup(false), 2500);
    return () => clearTimeout(t);
  }, [notifications]);

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

  useEffect(() => {
    if (!user) return;
    const userId = getUserId(user);
    if (!userId) return;

    (async () => {
      try {
        const history = await getUserTickets(userId, token);
        const sorted = [...(history || [])].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setTicketHistory(sorted);
      } catch (err) {
        console.warn("Ticket history failed", err);
      }
    })();
  }, [user, token, ticketStatus]);

  useEffect(() => {
    if (!user) return;
    const userId = getUserId(user);
    if (!userId) return;

    (async () => {
      try {
        const data = await getUserUploads(userId, token);
        setUploads(data || []);
      } catch (err) {
        console.warn("Upload history failed", err);
      }
    })();
  }, [user, token]);

  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ticket) return;
    setTicket((prev) => applyQueueMetrics(prev, queueOverview));
  }, [queueOverview]);

  const getOverallStatus = () => {
    const statuses = Object.values(clearance || {})
      .map((c) => c?.status)
      .filter(Boolean);
    const hasBlocked = statuses.includes("BLOCKED");
    const hasPending = statuses.includes("PENDING");
    if (hasBlocked) return { label: "Status: Blocked", tone: "bg-red-100 text-red-700" };
    if (hasPending) return { label: "Status: Action Required", tone: "bg-yellow-100 text-yellow-800" };
    if (statuses.length) return { label: "Status: Cleared", tone: "bg-green-100 text-green-700" };
    return { label: "Status: Checking...", tone: "bg-gray-100 text-gray-700" };
  };

  const getActionEligibility = (action) => {
    if (!action) return { eligible: true, reason: "" };
    const financeStatus = clearance?.finance?.status || "";
    if (action.id === "exam_block" && !["PAID", "CLEARED"].includes(financeStatus)) {
      return {
        eligible: false,
        reason: "Fees are pending. Resolve Fee Balance and join the Finance queue first.",
        suggestedActionId: "fee_balance",
      };
    }
    return { eligible: true, reason: "" };
  };

  const handleResolveDepartment = (department) => {
    const actionId = DEPARTMENT_TO_ACTION[department] || "fee_balance";
    const action = SMART_ACTIONS.find((item) => item.id === actionId) || SMART_ACTIONS[0];
    setSelectedAction(action);
    ticketPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const createQueueTicketForService = async (serviceType) => {
    if (!user) return alert("User not loaded");
    if (ticket && ticket.status !== "completed" && ticket.status !== "cancelled") {
      return alert(`You already have an active ticket for ${ticket.serviceType}. Cancel it to join a new queue.`);
    }

    const userId = getUserId(user);
    setLoadingTicket(true);
    try {
      const res = await createTicket({
        serviceType,
        studentName: user.name,
        email: user.email,
        userId,
        isVIP: Boolean(isVipRequest),
      });

      let newTicket = res.ticket;
      try {
        const next = await getNextTicket(serviceType, token);
        if (next?.ticketNumber && newTicket?.ticketNumber) {
          const ahead = Math.max(next.ticketNumber - newTicket.ticketNumber, 0);
          newTicket = { ...newTicket, peopleAhead: ahead, estimatedWait: ahead * 5 };
        }
      } catch (etaErr) {
        console.warn("Could not calculate ETA from next ticket", etaErr);
      }

      setTicket(applyQueueMetrics(newTicket, queueOverview));
      setTicketStatus(newTicket.status);
      setIsVipRequest(false);
      return newTicket;
    } catch (err) {
      console.error("Ticket creation failed:", err);
      alert(err?.response?.data?.message || "Failed to join queue");
      return null;
    } finally {
      setLoadingTicket(false);
    }
  };

  const getWorkflowPlan = () => {
    const financeStatus = clearance?.finance?.status || "";
    const financeCleared = ["PAID", "CLEARED", "APPROVED"].includes(financeStatus);
    const route =
      selectedAction.id === "exam_block"
        ? [!financeCleared ? "Finance" : null, "Examinations"].filter(Boolean)
        : selectedAction.id === "register_units"
        ? [!financeCleared ? "Finance" : null, "Student Records"].filter(Boolean)
        : ["Finance"];

    return route.map((serviceType) => {
      const key = SERVICE_TO_CLEARANCE_KEY[serviceType];
      const status = key ? clearance?.[key]?.status || "PENDING" : "PENDING";
      return { serviceType, done: CLEAR_STATUSES.includes(status), status };
    });
  };

  const handleAutoJoinWorkflow = async () => {
    const plan = getWorkflowPlan();
    const nextStep = plan.find((step) => !step.done);
    if (!nextStep) {
      return alert("All workflow steps are already complete.");
    }
    await createQueueTicketForService(nextStep.serviceType);
  };

  const refreshAppointments = async () => {
    try {
      const data = await getMyAppointments(token);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Appointments refresh failed", err);
    }
  };

  const handleBookAppointment = async () => {
    if (!bookingServiceType || !bookingTime) return alert("Select service and time.");
    setBookingLoading(true);
    try {
      await createAppointment(
        {
          serviceType: bookingServiceType,
          appointmentTime: new Date(bookingTime).toISOString(),
        },
        token
      );
      await refreshAppointments();
      alert("Appointment booked.");
    } catch (err) {
      console.error("Book appointment failed", err);
      alert(err?.response?.data?.message || "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinFromAppointment = async (appointmentId) => {
    try {
      const res = await joinQueueFromAppointment(appointmentId, token);
      if (res?.ticket) {
        setTicket(applyQueueMetrics(res.ticket, queueOverview));
        setTicketStatus(res.ticket.status);
      }
      await refreshAppointments();
      alert("Joined queue from appointment.");
    } catch (err) {
      console.error("Join from appointment failed", err);
      alert(err?.response?.data?.message || "Failed to join queue from appointment");
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await cancelAppointment(appointmentId, token);
      await refreshAppointments();
    } catch (err) {
      console.error("Cancel appointment failed", err);
      alert(err?.response?.data?.message || "Failed to cancel appointment");
    }
  };

  const handleGenerateTicket = async () => {
    if (!user) return alert("User not loaded");

    if (ticket && ticket.status !== "completed" && ticket.status !== "cancelled") {
      return alert(`You already have an active ticket for ${ticket.serviceType}. Cancel it to join a new queue.`);
    }

    const eligibility = getActionEligibility(selectedAction);
    if (!eligibility.eligible) {
      return alert(eligibility.reason);
    }

    const resolvedDepartment = SMART_ROUTING[selectedAction.id];
    await createQueueTicketForService(resolvedDepartment);
  };

  const handleJoinService = async (serviceType) => {
    if (!serviceType) return;
    await createQueueTicketForService(serviceType);
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

  const handleCheckIn = async () => {
    if (!ticket?._id) return;
    try {
      await checkInTicket(ticket._id, token);
      setTicket((prev) => (prev ? { ...prev, checkInRequired: false, checkedInAt: new Date().toISOString() } : prev));
      setNearTurnAlert("Checked in successfully.");
      setNotifications((prev) => [{ message: "Checked in successfully.", time: new Date() }, ...prev]);
    } catch (err) {
      console.error("Check-in failed:", err);
      alert(err?.response?.data?.message || "Failed to check in");
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles.length || !user) return;
    const userId = getUserId(user);
    if (!userId) return;

    setUploading(true);
    try {
      await uploadDocuments({ files: uploadFiles, ticketId: ticket?._id, category: "clearance" }, token);
      setUploadFiles([]);
      const data = await getUserUploads(userId, token);
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

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.message.trim()) return alert("Please enter your feedback message.");
    if (feedbackForm.type === "feedback" && (!feedbackForm.rating || Number(feedbackForm.rating) < 1 || Number(feedbackForm.rating) > 5)) {
      return alert("Rating must be between 1 and 5.");
    }

    setFeedbackSubmitting(true);
    try {
      const payload = {
        type: feedbackForm.type,
        rating: feedbackForm.type === "feedback" ? Number(feedbackForm.rating) : undefined,
        category: feedbackForm.category,
        ticketId: feedbackForm.ticketId || undefined,
        message: feedbackForm.message.trim(),
        priority: feedbackForm.type === "complaint" ? feedbackForm.priority : undefined,
      };

      await submitFeedback(payload, token);
      const data = await getMyFeedback(token, 10);
      setFeedbackList(data || []);
      setFeedbackForm((prev) => ({
        ...prev,
        message: "",
        ticketId: "",
      }));
      alert("Submitted successfully.");
    } catch (err) {
      console.error("Submit feedback failed", err);
      alert(err?.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const overall = getOverallStatus();
  const eligibility = getActionEligibility(selectedAction);
  const workflowPlan = getWorkflowPlan();
  const regNo = getRegistrationNo(user);
  const program = getProgram(user);
  const year = getYear(user);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {showNotifPopup && (
          <div className="fixed top-5 right-5 bg-gray-900 text-white text-xs px-4 py-2 rounded shadow-lg z-20">
            {notifPopupMessage}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow p-4 mb-6 gap-4">
          <div>
            <div className="font-bold text-lg">{user?.name || "Student"}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-sm text-gray-500">Reg No: {regNo || "Not set in profile"}</div>
            <div className="text-sm text-gray-500">
              Program: {program || "Not set in profile"} | Year: {year || "Not set in profile"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen((v) => !v)}
                className="text-xs px-3 py-1 rounded-full font-semibold border"
              >
                Notifications ({notifications.length})
              </button>
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow-lg z-10">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b">Previous notifications</div>
                  <div className="max-h-52 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">No notifications yet</div>
                    )}
                    {notifications.map((n, i) => (
                      <div key={i} className="px-3 py-2 text-xs border-b last:border-b-0">
                        {n.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="text-red-600 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ClearanceStatus user={user} onResolveDepartment={handleResolveDepartment} />

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

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Workflow Automation</h3>
              <div className="text-xs text-gray-500 mb-3">
                Multi-office routing for <span className="font-semibold">{selectedAction.title}</span>
              </div>
              <div className="space-y-2 mb-3">
                {workflowPlan.map((step, idx) => (
                  <div key={`${step.serviceType}-${idx}`} className="border rounded p-2 flex items-center justify-between">
                    <div className="text-sm">{step.serviceType}</div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        step.done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {step.done ? "done" : "next"}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAutoJoinWorkflow}
                disabled={loadingTicket}
                className="w-full bg-[#182B5C] text-white py-2 rounded disabled:opacity-60"
              >
                {loadingTicket ? "Joining..." : "Auto-Join Next Queue Step"}
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Feedback, Rating & Complaints</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <select
                    value={feedbackForm.type}
                    onChange={(e) => setFeedbackForm((s) => ({ ...s, type: e.target.value }))}
                    className="border rounded p-2"
                  >
                    <option value="feedback">Feedback</option>
                    <option value="complaint">Complaint</option>
                  </select>
                  <select
                    value={feedbackForm.category}
                    onChange={(e) => setFeedbackForm((s) => ({ ...s, category: e.target.value }))}
                    className="border rounded p-2"
                  >
                    <option value="general">General</option>
                    <option value="service_quality">Service Quality</option>
                    <option value="delay">Delay</option>
                    <option value="staff_conduct">Staff Conduct</option>
                    <option value="system">System</option>
                  </select>
                </div>
                {feedbackForm.type === "feedback" ? (
                  <select
                    value={feedbackForm.rating}
                    onChange={(e) => setFeedbackForm((s) => ({ ...s, rating: Number(e.target.value) }))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Very Poor</option>
                  </select>
                ) : (
                  <select
                    value={feedbackForm.priority}
                    onChange={(e) => setFeedbackForm((s) => ({ ...s, priority: e.target.value }))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                )}
                <select
                  value={feedbackForm.ticketId}
                  onChange={(e) => setFeedbackForm((s) => ({ ...s, ticketId: e.target.value }))}
                  className="w-full border rounded p-2 text-sm"
                >
                  <option value="">Link to ticket (optional)</option>
                  {ticketHistory
                    .filter((t) => t.status === "completed")
                    .slice(0, 20)
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        #{t.ticketNumber} - {t.serviceType}
                      </option>
                    ))}
                </select>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm((s) => ({ ...s, message: e.target.value }))}
                  placeholder="Write your feedback or complaint..."
                  rows={3}
                  className="w-full border rounded p-2 text-sm"
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={feedbackSubmitting}
                  className="w-full bg-[#182B5C] text-white py-2 rounded disabled:opacity-60"
                >
                  {feedbackSubmitting ? "Submitting..." : "Submit"}
                </button>
                <div className="text-xs text-gray-500 pt-2">Recent submissions</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {feedbackList.length === 0 && <div className="text-xs text-gray-500">No submissions yet</div>}
                  {feedbackList.map((item) => (
                    <div key={item._id} className="border rounded p-2 text-xs">
                      <div className="font-semibold capitalize">
                        {item.type} {item.rating ? `(${item.rating}/5)` : ""} - {item.status}
                      </div>
                      <div className="text-gray-600">{item.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div ref={ticketPanelRef} className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Ticket</h3>

              {ticket && ticket.status !== "completed" && ticket.status !== "cancelled" && (
                <button onClick={handleCancelTicket} className="w-full bg-red-600 text-white py-2 rounded mb-3">
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

              <label className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <input
                  type="checkbox"
                  checked={isVipRequest}
                  onChange={(e) => setIsVipRequest(e.target.checked)}
                />
                Mark this ticket as VIP
              </label>

              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2">Join a specific service</div>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((service) => (
                    <button
                      key={service}
                      onClick={() => handleJoinService(service)}
                      disabled={loadingTicket}
                      className="border rounded px-2 py-2 text-xs hover:bg-gray-50 disabled:opacity-60"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {!eligibility.eligible && (
                <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                  {eligibility.reason}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAction(SMART_ACTIONS.find((a) => a.id === eligibility.suggestedActionId) || SMART_ACTIONS[0])
                    }
                    className="ml-2 text-blue-700 underline"
                  >
                    Switch to Finance action
                  </button>
                </div>
              )}

              {!ticket && <p className="text-gray-500">No active ticket</p>}

              {ticket && (
                <div className="bg-[#F7F9FF] p-3 rounded">
                  <div className="font-bold">Ticket #{ticket.ticketNumber}</div>
                  <div>
                    Status:{" "}
                    <span style={{ color: STATUS_CONFIG[ticketStatus]?.color || "#000", fontWeight: "bold" }}>
                      {STATUS_CONFIG[ticketStatus]?.label || ticketStatus}
                    </span>
                  </div>
                  {ticket.isVIP && (
                    <div className="mt-1 inline-flex items-center text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      VIP Priority
                    </div>
                  )}
                  <div>People ahead: {ticket.peopleAhead ?? "-"}</div>
                  <div>Estimated wait: {ticket.estimatedWait ?? "-"} mins</div>
                  {nearTurnAlert && (
                    <div className="mt-2 text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded p-2">
                      {nearTurnAlert}
                    </div>
                  )}
                  {ticket.checkInRequired && ticket.status === "waiting" && (
                    <button onClick={handleCheckIn} className="mt-2 text-sm bg-amber-500 text-white px-3 py-1 rounded">
                      Check In Now
                    </button>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={downloadQrTicket} className="text-sm bg-gray-900 text-white px-3 py-1 rounded">
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

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Ticket History</h3>
              {ticketHistory.length === 0 && <div className="text-sm text-gray-500">No ticket history yet</div>}
              <div className="space-y-2">
                {ticketHistory.slice(0, 5).map((t) => (
                  <div key={t._id} className="border rounded p-2">
                    <div className="font-semibold">
                      #{t.ticketNumber} | {t.serviceType}
                    </div>
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

          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-3">Self-Service & Uploads</h3>
              <div className="space-y-3">
                <div className="border rounded p-3">
                  <div className="font-semibold text-sm mb-2">Smart Appointment Booking</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <select
                      value={bookingServiceType}
                      onChange={(e) => setBookingServiceType(e.target.value)}
                      className="border rounded p-2 text-sm"
                    >
                      <option>Admissions</option>
                      <option>Finance</option>
                      <option>Examinations</option>
                      <option>Library</option>
                      <option>Accommodation</option>
                      <option>Student Records</option>
                      <option>ICT Support</option>
                      <option>Counselling</option>
                      <option>General Enquiries</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="border rounded p-2 text-sm"
                    />
                    <button
                      onClick={handleBookAppointment}
                      disabled={bookingLoading}
                      className="bg-[#182B5C] text-white rounded p-2 text-sm disabled:opacity-60"
                    >
                      {bookingLoading ? "Booking..." : "Book"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {appointments.length === 0 && <div className="text-xs text-gray-500">No appointments yet</div>}
                    {appointments.slice(0, 6).map((a) => (
                      <div key={a._id} className="border rounded p-2 text-xs">
                        <div className="font-semibold">
                          {a.serviceType} • {new Date(a.appointmentTime).toLocaleString()}
                        </div>
                        <div className="text-gray-500 mb-1">Status: {a.status}</div>
                        {a.status === "booked" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleJoinFromAppointment(a._id)} className="border rounded px-2 py-1">
                              Join Queue
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(a._id)}
                              className="border rounded px-2 py-1 text-red-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    className="block w-full text-sm"
                  />
                  {uploadFiles.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2">{uploadFiles.map((f) => f.name).join(", ")}</div>
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
                <div className="space-y-3">
                  {(uploads || []).slice(0, 3).map((u) => (
                    <div key={u._id} className="truncate text-xs text-gray-600">
                      {u.originalName}
                    </div>
                  ))}
                  {(!uploads || uploads.length === 0) && <div className="text-xs text-gray-600">No uploads yet</div>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <a className="border rounded p-2 text-center" href="/student/upload-docs">
                    Open Upload Center
                  </a>
                  <a className="border rounded p-2 text-center" href="/student/status">
                    View Ticket Status
                  </a>
                  <a className="border rounded p-2 text-center" href="/student/notifications">
                    Notifications
                  </a>
                  <a className="border rounded p-2 text-center" href="/student/profile">
                    Profile
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-xl mb-1">Central Queue Overview</h3>
              <p className="text-xs text-gray-500 mb-3">
                Live queues. Tap Join to enter a specific service queue.
              </p>
              <div className="space-y-2">
                {queueOverview.length === 0 && <div className="text-sm text-gray-500">Queue data unavailable</div>}
                {queueOverview.map((q) => (
                  <div key={q.serviceType} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <div className="font-semibold">{q.serviceType}</div>
                      <div className="text-xs text-gray-500">
                        {q.waiting} waiting | {q.estimatedWaitMins} mins
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          q.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getQueueDisplayStatus(q.status)}
                      </span>
                      <button
                        onClick={() => handleJoinService(q.serviceType)}
                        disabled={loadingTicket || q.status !== "open"}
                        className="text-xs border rounded px-2 py-1 disabled:opacity-50"
                        title={q.status !== "open" ? "Queue is closed" : "Join queue"}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
