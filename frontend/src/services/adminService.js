import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, '')}/api/admin`;

// -------------------- Ticket & Queue --------------------
export const getAllTickets = async (filter = {}) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/tickets`, { 
    headers: { Authorization: `Bearer ${token}` },
    params: filter,
  });
  return res.data;
};

export const getSystemKPI = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/kpi`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// -------------------- Routing Rules --------------------
export const getRoutingRules = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/routing`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const createRoutingRule = async (rule) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(`${API_URL}/routing`, rule, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const updateRoutingRule = async (id, rule) => {
  const token = localStorage.getItem("token");
  const res = await axios.put(`${API_URL}/routing/${id}`, rule, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const deleteRoutingRule = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.delete(`${API_URL}/routing/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// -------------------- Counters --------------------
export const getCounters = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/counters`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const addCounter = async (counter) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(`${API_URL}/counters`, counter, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const removeCounter = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.delete(`${API_URL}/counters/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// -------------------- Audit Logs --------------------
export const getAuditLogs = async (params = {}) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/logs`, { headers: { Authorization: `Bearer ${token}` }, params });
  return res.data;
};

// -------------------- Integration Monitoring --------------------
export const getIntegrationStatus = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/integration-status`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// -------------------- Capacity Planning --------------------
export const setExtraCounters = async (count) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(`${API_URL}/extra-counters`, { count }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};
