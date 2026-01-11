import React, { useState, useEffect } from "react";
import { createTicket, getNextTicket } from "../services/ticketService";
import SidebarLayout from "../components/sidebarLayout";

const announcements = [
  "📢 Admissions office closes at 4:30 PM today",
  "🧾 Carry your student ID for all services",
  "📚 Library clearance ongoing this week",
  "💡 Most services are available via the student portal",
];

const SERVICES = [
  "Admissions",
  "Finance",
  "Library",
  "Examinations",
  "Accommodation",
];

const CustomerPage = () => {
  const [serviceType, setServiceType] = useState("Admissions");
  const [ticket, setTicket] = useState(null);
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [loading, setLoading] = useState(false);

  // Appointment
  const [appointment, setAppointment] = useState(null);
  const [apptDept, setApptDept] = useState("Admissions");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");

  // Announcements
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

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

  const handleBookAppointment = () => {
    if (!apptDate || !apptTime) return;
    setAppointment({
      department: apptDept,
      date: apptDate,
      time: apptTime,
    });
    setApptDate("");
    setApptTime("");
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#182B5C] via-[#1f3a7a] to-[#0f1f42] p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* QUEUE CARD */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-extrabold text-[#182B5C] mb-4">
              🎫 Queue Services
            </h2>

            <label className="font-semibold text-gray-700">
              Select Department
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full mt-2 border-2 rounded-lg p-3 focus:ring-2 focus:ring-[#D0B216]"
            >
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <button
              onClick={handleGenerateTicket}
              disabled={loading}
              className="w-full mt-4 bg-[#182B5C] text-[#D0B216] font-bold py-3 rounded-lg hover:bg-[#101f42] transition"
            >
              {loading ? "Generating Ticket..." : "Generate Ticket"}
            </button>

            {ticket && (
              <div className="mt-6 bg-[#182B5C]/5 rounded-xl p-4 border-l-4 border-[#D0B216]">
                <p className="text-lg font-bold text-[#182B5C]">
                  Ticket #{ticket.ticketNumber}
                </p>
                <p className="mt-2">
                  People Ahead:{" "}
                  <span className="font-semibold">{peopleAhead}</span>
                </p>
                <p>
                  Estimated Wait:{" "}
                  <span className="font-semibold">{estimatedWait}</span> mins
                </p>
              </div>
            )}
          </div>

          {/* APPOINTMENT CARD */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-extrabold text-[#182B5C] mb-4">
              📅 Appointments
            </h2>

            {!appointment ? (
              <>
                <select
                  value={apptDept}
                  onChange={(e) => setApptDept(e.target.value)}
                  className="w-full border-2 rounded-lg p-3 mb-3"
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-full border-2 rounded-lg p-3 mb-3"
                />

                <input
                  type="time"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="w-full border-2 rounded-lg p-3 mb-4"
                />

                <button
                  onClick={handleBookAppointment}
                  className="w-full bg-[#D0B216] text-[#182B5C] font-bold py-3 rounded-lg hover:bg-yellow-500 transition"
                >
                  Book Appointment
                </button>
              </>
            ) : (
              <div className="bg-[#D0B216]/10 p-4 rounded-xl border-l-4 border-[#D0B216]">
                <p className="font-bold">{appointment.department}</p>
                <p>Date: {appointment.date}</p>
                <p>Time: {appointment.time}</p>
                <button
                  onClick={() => setAppointment(null)}
                  className="mt-3 text-red-600 font-semibold"
                >
                  Cancel Appointment
                </button>
              </div>
            )}
          </div>

          {/* INFO BOARD */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-extrabold text-[#182B5C] mb-4">
              📢 Information Board
            </h2>

            <div className="bg-[#182B5C]/5 rounded-xl p-5 text-center font-medium text-[#182B5C] animate-pulse">
              {announcements[announcementIndex]}
            </div>

            <div className="mt-6 text-sm text-gray-600">
              ⏱ Queue times are estimates and may change.
            </div>
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
};

export default CustomerPage;
