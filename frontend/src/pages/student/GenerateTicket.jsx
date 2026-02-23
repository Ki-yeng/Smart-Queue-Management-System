import { useEffect, useState } from "react";
import { createTicket } from "../../services/ticketService";
import { getCurrentUser } from "../../services/authService";

const GenerateTicket = () => {
  const [service, setService] = useState("Admissions");
  const [ticket, setTicket] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const me = await getCurrentUser();
      setUser(me?.user || me || null);
    })();
  }, []);

  const handleGenerate = async () => {
    if (!user) {
      setError("User not loaded. Please re-login.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await createTicket({
        serviceType: service,
        studentName: user.name || "Student",
        email: user.email || "",
        userId: user._id || user.id,
      });
      setTicket(res.ticket || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Generate Ticket</h2>

      <select className="border p-2 mt-3" value={service} onChange={(e) => setService(e.target.value)}>
        <option>Admissions</option>
        <option>Finance</option>
        <option>Library</option>
        <option>Examinations</option>
        <option>Accommodation</option>
        <option>Student Records</option>
        <option>ICT Support</option>
        <option>Counselling</option>
        <option>General Enquiries</option>
      </select>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="block mt-4 bg-[#182B5C] text-[#D0B216] px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}

      {ticket && (
        <p className="mt-4">
          Your Ticket Number: <strong>{ticket.ticketNumber}</strong>
        </p>
      )}
    </div>
  );
};

export default GenerateTicket;
