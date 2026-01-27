import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, '')}/api/tickets`;

/**
 * Create a new ticket (Student)
 * @param {string} serviceType
 */
export const createTicket = async (serviceType) => {
  const response = await axios.post(`${API_URL}/create`, { serviceType });
  return response.data;
};

/**
 * Get next ticket for a service (Student)
 * @param {string} serviceType
 */
export const getNextTicket = async (serviceType) => {
  const response = await axios.get(`${API_URL}/next/${encodeURIComponent(serviceType)}`);
  return response.data;
};

/**
 * Get latest ticket for current student
 */
export const getLatestTicket = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/latest`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

/**
 * Get all tickets for current student
 */
export const getTicketsByStudent = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/my`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

/**
 * Get ticket by ID (Staff)
 */
export const getTicketById = async (id, token) => {
  const res = await axios.get(`${API_URL}/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

/**
 * Get waiting tickets (Staff)
 */
export const getWaitingTickets = async (token, serviceType) => {
  const url = `${API_URL}/waiting${serviceType ? '?serviceType=' + encodeURIComponent(serviceType) : ''}`;
  const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.data;
};

/**
 * Perform a staff action on a ticket
 */
export const staffAction = async (id, action, payload, token) => {
  const res = await axios.post(
    `${API_URL}/action/${id}`,
    { action, payload },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};

/**
 * Transfer a ticket to another service
 */
export const transferTicket = async (id, toService, token) => {
  const res = await axios.post(
    `${API_URL}/transfer/${id}`,
    { toService },
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};
