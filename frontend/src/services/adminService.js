import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/admin`;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getTicketsPerDay = async () => {
  const res = await axios.get(`${API_URL}/tickets-per-day`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
};

export const getDepartmentStats = async () => {
  const res = await axios.get(`${API_URL}/department-stats`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
};

export const getAverageWaitTime = async () => {
  const res = await axios.get(`${API_URL}/average-wait-time`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
};

export const getStaffPerformance = async () => {
  const res = await axios.get(`${API_URL}/staff-performance`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
};

export const getHourlyPeak = async () => {
  const res = await axios.get(`${API_URL}/hourly-peak`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
};
