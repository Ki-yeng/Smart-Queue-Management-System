import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/feedback`;

const withAuth = (token) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const submitFeedback = async (payload, token) => {
  const res = await axios.post(API_URL, payload, withAuth(token));
  return res.data?.data || res.data;
};

export const getMyFeedback = async (token, limit = 50) => {
  const res = await axios.get(`${API_URL}/my?limit=${limit}`, withAuth(token));
  return res.data?.data || [];
};

export const getFeedbackQueue = async (token, filters = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const res = await axios.get(`${API_URL}/queue?${query.toString()}`, withAuth(token));
  return res.data?.data || [];
};

export const updateFeedbackStatus = async (id, payload, token) => {
  const res = await axios.patch(`${API_URL}/${id}/status`, payload, withAuth(token));
  return res.data?.data || res.data;
};

export const getFeedbackSummary = async (token) => {
  const res = await axios.get(`${API_URL}/summary`, withAuth(token));
  return res.data?.data || {};
};

