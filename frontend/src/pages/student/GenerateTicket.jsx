import { useState } from "react";
import { createTicket } from "../../services/ticketService";

const GenerateTicket = () => {
  const [service, setService] = useState("Admissions");
  const [ticket, setTicket] = useState(null);

  const handleGenerate = async () => {
    const res = await createTicket(service);
    setTicket(res.ticket);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">Generate Ticket</h2>

      <select
        className="border p-2 mt-3"
        value={service}
        onChange={(e) => setService(e.target.value)}
      >
        <option>Admissions</option>
        <option>Finance</option>
        <option>Library</option>
        <option>Examinations</option>
      </select>

      <button
        onClick={handleGenerate}
        className="block mt-4 bg-[#182B5C] text-[#D0B216] px-4 py-2 rounded"
      >
        Generate
      </button>

      {ticket && (
        <p className="mt-4">
          Your Ticket Number: <strong>{ticket.ticketNumber}</strong>
        </p>
      )}
    </div>
  );
};

export default GenerateTicket;
