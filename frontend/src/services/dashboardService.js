import axios from "axios";

// Fetch dashboard data from backend
export const getDashboardStats = async (email, token) => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/dashboard`,
      { email }, // send email in body
      { headers: { Authorization: `Bearer ${token}` } } // send token in headers
    );
    return res.data; // return dashboard data
  } catch (err) {
    console.error("Dashboard fetch error:", err.response?.data || err);
    throw err;
  }
};
