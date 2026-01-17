import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, '')}/api/tickets`;

/**
 * Create a new ticket
 * @param {string} serviceType
 */
export const createTicket = async (serviceType) => {
  const response = await axios.post(`${API_URL}/create`, {
    serviceType,
  });
  return response.data;
};

/**
 * Get next ticket for a service
 * @param {string} serviceType
 */
export const getNextTicket = async (serviceType) => {
  const response = await axios.get(
    `${API_URL}/next/${encodeURIComponent(serviceType)}`
  );
  return response.data;
};

// Staff APIs
export const getWaitingTickets = async (token, serviceType) => {
  const url = `${API_URL}/waiting${serviceType ? '?serviceType=' + encodeURIComponent(serviceType) : ''}`;
  const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

export const getTicketById = async (id, token) => {
  const res = await axios.get(`${API_URL}/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

export const staffAction = async (id, action, payload, token) => {
  const res = await axios.post(`${API_URL}/action/${id}`, { action, payload }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

export const transferTicket = async (id, toService, token) => {
  const res = await axios.post(`${API_URL}/transfer/${id}`, { toService }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};
