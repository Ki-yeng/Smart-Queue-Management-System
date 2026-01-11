import { useEffect, useState } from "react";
import axios from "axios";

const TicketStatus = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/tickets")
      .then(res => setTickets(res.data.tickets || res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#182B5C]">My Ticket Status</h2>

      {tickets.map((t, i) => (
        <div key={i} className="mt-3 bg-white p-3 rounded shadow">
          <p>Ticket: {t.ticketNumber}</p>
          <p>Status: <strong>{t.status}</strong></p>
        </div>
      ))}
    </div>
  );
};

export default TicketStatus;
