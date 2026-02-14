import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${BASE.replace(/\/$/, "")}/api/uploads`;

export const uploadDocuments = async ({ files, ticketId, category }, token) => {
  const auth = token || localStorage.getItem("token");
  const formData = new FormData();
  (files || []).forEach((file) => formData.append("files", file));
  if (ticketId) formData.append("ticketId", ticketId);
  if (category) formData.append("category", category);

  const res = await axios.post(API_URL, formData, {
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const getUserUploads = async (userId, token) => {
  const auth = token || localStorage.getItem("token");
  const res = await axios.get(`${API_URL}/user/${userId}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  });
  return res.data?.uploads || [];
};
