import React, { useEffect, useState } from "react";
import SidebarLayout from "../components/sidebarLayout";

const StaffDashboard = () => {
  const [activeQueues, setActiveQueues] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [customersServed, setCustomersServed] = useState(0);
  const [serviceTimes, setServiceTimes] = useState([]);

  const [studentName, setStudentName] = useState("");
  const [serviceType, setServiceType] = useState("Admissions");

  // Fetch tickets from database (replace mock if API ready)
  useEffect(() => {
    setActiveQueues([
      { ticket: "A12", name: "John Student", service: "Admissions" },
      { ticket: "A13", name: "Mary Wanjiku", service: "Admissions" },
    ]);
  }, []);

  /* ================= QUEUE CONTROLS ================= */
  const callNextStudent = () => {
    if (activeQueues.length === 0) return;
    setCurrentTicket(activeQueues[0]);
    setActiveQueues((prev) => prev.slice(1));
  };

  const completeService = () => {
    if (!currentTicket) return;
    setCustomersServed((c) => c + 1);
    setServiceTimes((t) => [...t, Math.floor(Math.random() * 10) + 5]);
    setCurrentTicket(null);
  };

  const holdTicket = () => {
    if (!currentTicket) return;
    setActiveQueues((q) => [...q, currentTicket]);
    setCurrentTicket(null);
  };

  const transferTicket = (newService) => {
    if (!currentTicket) return;
    setActiveQueues((q) => [...q, { ...currentTicket, service: newService }]);
    setCurrentTicket(null);
  };

  const avgServiceTime =
    serviceTimes.length > 0
      ? Math.round(serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length)
      : 0;

  /* ================= MANUAL REGISTRATION ================= */
  const registerManualStudent = () => {
    if (!studentName) return;
    setActiveQueues((q) => [
      ...q,
      { ticket: `M${Math.floor(Math.random() * 100)}`, name: studentName, service: serviceType },
    ]);
    setStudentName("");
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#182B5C] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* CURRENT SERVICE */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-[#D0B216]">
            <h2 className="text-xl font-bold text-[#182B5C] mb-4">🎯 Current Ticket</h2>
            {currentTicket ? (
              <>
                <p className="font-semibold">Ticket: {currentTicket.ticket}</p>
                <p>Name: {currentTicket.name}</p>
                <p>Service: {currentTicket.service}</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={completeService}
                    className="w-full bg-[#182B5C] text-[#D0B216] py-2 rounded-lg font-bold"
                  >
                    Complete Service
                  </button>
                  <button
                    onClick={holdTicket}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg"
                  >
                    Put on Hold
                  </button>
                  <button
                    onClick={() => transferTicket("Finance")}
                    className="w-full bg-[#D0B216] text-[#182B5C] py-2 rounded-lg font-bold"
                  >
                    Transfer to Finance
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={callNextStudent}
                className="w-full bg-[#182B5C] text-[#D0B216] py-3 rounded-lg font-bold"
              >
                Call Next Student
              </button>
            )}
          </div>

          {/* ACTIVE QUEUE */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-[#182B5C]">
            <h2 className="text-xl font-bold text-[#182B5C] mb-4">📋 Active Queue</h2>
            {activeQueues.length > 0 ? (
              activeQueues.map((q, i) => (
                <div key={i} className="border-b py-2 flex justify-between flex-wrap text-sm">
                  <span className="w-1/3 sm:w-auto">{q.ticket}</span>
                  <span className="w-1/3 sm:w-auto">{q.name}</span>
                  <span className="w-1/3 sm:w-auto text-[#182B5C] font-semibold">{q.service}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 mt-2">No active tickets</p>
            )}
          </div>

          {/* PERFORMANCE */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-[#D0B216]">
            <h2 className="text-xl font-bold text-[#182B5C] mb-4">📊 Performance</h2>
            <p>Customers Served: <strong>{customersServed}</strong></p>
            <p>
              Avg Service Time:{" "}
              <strong>
                {avgServiceTime} min
              </strong>
            </p>
          </div>

          {/* MANUAL REGISTRATION */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-[#182B5C] lg:col-span-3">
            <h2 className="text-xl font-bold text-[#182B5C] mb-4">✍️ Manual Student Registration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Student Name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="border-2 rounded-lg p-2 w-full"
              />
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="border-2 rounded-lg p-2 w-full"
              >
                <option>Admissions</option>
                <option>Finance</option>
                <option>Library</option>
                <option>Examinations</option>
              </select>
              <button
                onClick={registerManualStudent}
                className="bg-[#D0B216] text-[#182B5C] font-bold rounded-lg py-2 w-full"
              >
                Register Student
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default StaffDashboard;
