import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/appointments`;

const withAuth = (token) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const getMyAppointments = async (token) => {
  const res = await axios.get(API_URL, withAuth(token));
  return res.data || [];
};

export const createAppointment = async (payload, token) => {
  const res = await axios.post(API_URL, payload, withAuth(token));
  return res.data || null;
};

export const cancelAppointment = async (id, token) => {
  const res = await axios.put(`${API_URL}/${id}/cancel`, {}, withAuth(token));
  return res.data || null;
};

export const joinQueueFromAppointment = async (id, token) => {
  const res = await axios.put(`${API_URL}/${id}/join-queue`, {}, withAuth(token));
  return res.data || null;
};

