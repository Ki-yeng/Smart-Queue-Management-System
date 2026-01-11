import axios from "axios";

// Base URL of your backend
const API_URL = "http://localhost:5000/api/auth";

/**
 * Register a new user
 * @param {Object} userData - { name, email, password, role }
 */
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (err) {
    console.error("Register error:", err.response?.data || err);
    throw err;
  }
};

/**
 * Login a user
 * @param {Object} credentials - { email, password }
 */
export const loginUser = async ({ email, password }) => {
  try {
    const response = await axios.post(
      `${API_URL}/login`,
      { email, password },
      { headers: { "Content-Type": "application/json" } }
    );

    // Save token and user info
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (err) {
    console.error("Login error:", err.response?.data || err);
    throw err;
  }
};

/**
 * Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

/**
 * Get currently logged-in user info
 */
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    console.error("Get current user error:", err.response?.data || err);
    return null;
  }
};
