import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/tickets`;

/* ================= STUDENT ================= */

// Create a new ticket
export const createTicket = async ({ serviceType, studentName, email, userId }) => {
  const token = localStorage.getItem("token");

  const res = await axios.post(
    API_URL,
    { serviceType, studentName, email, userId },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );

  return res.data;
};

// Get latest ticket for a student
export const getLatestTicket = async (studentId, token) => {
  token = token || localStorage.getItem("token");

  const res = await axios.get(`${API_URL}?studentId=${studentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return res.data || null;
};

// Get next ticket (for ETA calculation)
export const getNextTicket = async (serviceType, token) => {
  token = token || localStorage.getItem("token");

  const res = await axios.get(`${API_URL}/next/${encodeURIComponent(serviceType)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return res.data || null;
};

// Get ticket by ID
export const getTicketById = async (id, token) => {
  token = token || localStorage.getItem("token");

  try {
    const res = await axios.get(`${API_URL}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data || null;
  } catch (err) {
    console.error("getTicketById failed:", err);
    return null;
  }
};

/* ================= STAFF ================= */

// Get all waiting tickets (optionally filtered by service)
export const getWaitingTickets = async (token, serviceType = "") => {
  token = token || localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/waiting${serviceType ? `?serviceType=${serviceType}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data || [];
};

// Transfer a ticket to another department
export const transferTicket = async (ticketId, newDept, token) => {
  token = token || localStorage.getItem("token");
  const res = await axios.put(
    `${API_URL}/${ticketId}/transfer`,
    { newDept },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};

// Placeholder staff action (does not break frontend)
export const staffAction = async (ticketId, action, payload = {}, token) => {
  token = token || localStorage.getItem("token");
  // Simulate backend update, returns the same ticket for now
  return { ticket: { _id: ticketId, ...payload }, context: {} };
};
// Cancel a ticket (frontend wrapper)
export const cancelTicket = async (id) => {
  const token = localStorage.getItem("token");
  try {
    const res = await axios.put(`${API_URL}/cancel/${id}`, null, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  } catch (err) {
    console.error("cancelTicket failed:", err);
    return null;
  }
};
