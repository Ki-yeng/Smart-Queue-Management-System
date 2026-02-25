import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/office`;

const withAuth = (token) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const requestTranscript = async ({ userId, reason }, token) => {
  const res = await axios.post(`${API_URL}/registry/transcripts/request`, { userId, reason }, withAuth(token));
  return res.data?.data || res.data;
};

export const getUnifiedProfile = async (userId, token) => {
  const res = await axios.get(`${API_URL}/profile/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const getOfficeTransactions = async (userId, token, limit = 20) => {
  const res = await axios.get(`${API_URL}/transactions/${userId}?limit=${limit}`, withAuth(token));
  return res.data?.data || res.data;
};

export const getFeeBalance = async (userId, token) => {
  const res = await axios.get(`${API_URL}/finance/fee-balance/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const verifyFeeClearance = async (userId, token) => {
  const res = await axios.get(`${API_URL}/finance/clearance/verify/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const generateExamCard = async (userId, token) => {
  const res = await axios.post(`${API_URL}/registry/exam-card/generate`, { userId }, withAuth(token));
  return res.data?.data || res.data;
};

export const verifyUnitRegistration = async (userId, token) => {
  const res = await axios.get(`${API_URL}/registry/unit-registration/verify/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const trackGraduationClearance = async (userId, token) => {
  const res = await axios.get(`${API_URL}/registry/graduation-clearance/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const lookupAcademicStatus = async (userId, token) => {
  const res = await axios.get(`${API_URL}/registry/academic-status/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const automatePasswordReset = async (userId, token) => {
  const res = await axios.post(`${API_URL}/ict/password-reset`, { userId }, withAuth(token));
  return res.data?.data || res.data;
};

export const getICTIdCardStatus = async (userId, token) => {
  const res = await axios.get(`${API_URL}/ict/id-card-status/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const getEmailActivationStatus = async (userId, token) => {
  const res = await axios.get(`${API_URL}/ict/email-activation/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const approveLibraryClearance = async (userId, token) => {
  const res = await axios.post(`${API_URL}/library/clearance/approve`, { userId }, withAuth(token));
  return res.data?.data || res.data;
};

export const getLibraryFineBalance = async (userId, token) => {
  const res = await axios.get(`${API_URL}/library/fines/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const getBookReturnStatus = async (userId, token) => {
  const res = await axios.get(`${API_URL}/library/book-return-status/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const confirmHostelClearance = async (userId, token) => {
  const res = await axios.post(`${API_URL}/hostel/clearance/confirm`, { userId }, withAuth(token));
  return res.data?.data || res.data;
};

export const getRoomAllocation = async (userId, token) => {
  const res = await axios.get(`${API_URL}/hostel/room-allocation/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const verifyHostelPayment = async (userId, token) => {
  const res = await axios.get(`${API_URL}/hostel/payment-verification/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};

export const approveSecurityGraduationClearance = async (userId, token) => {
  const res = await axios.post(`${API_URL}/security/graduation-clearance/approve`, { userId }, withAuth(token));
  return res.data?.data || res.data;
};

export const getSecurityIdCardProduction = async (userId, token) => {
  const res = await axios.get(`${API_URL}/security/id-card-production/${userId}`, withAuth(token));
  return res.data?.data || res.data;
};
