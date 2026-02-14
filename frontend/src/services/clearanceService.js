import axios from "axios";


const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/clearance`;


export const getClearanceStatus = async (studentId, token) => {
  const auth = token || localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/${studentId}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  });
  return res.data;
};
