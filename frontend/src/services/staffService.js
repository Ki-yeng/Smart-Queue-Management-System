import axios from "axios";

const API_URL = "http://localhost:5000/api/queue"; // your backend queue endpoint

// Fetch current queue
export const getQueue = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // array of tickets
  } catch (err) {
    console.error("Error fetching queue:", err.response?.data || err);
    throw err;
  }
};

// Call next ticket
export const callNextTicket = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(`${API_URL}/next`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // ticket served
  } catch (err) {
    console.error("Error calling next ticket:", err.response?.data || err);
    throw err;
  }
};

// Complete ticket
export const completeTicket = async (ticketId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.patch(`${API_URL}/${ticketId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    console.error("Error completing ticket:", err.response?.data || err);
    throw err;
  }
};

// Cancel ticket
export const cancelTicket = async (ticketId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.patch(`${API_URL}/${ticketId}/cancel`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    console.error("Error cancelling ticket:", err.response?.data || err);
    throw err;
  }
};

// Transfer ticket
export const transferTicket = async (ticketId, serviceType) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.patch(`${API_URL}/${ticketId}/transfer`, { serviceType }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    console.error("Error transferring ticket:", err.response?.data || err);
    throw err;
  }
};
