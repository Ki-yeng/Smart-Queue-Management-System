import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

// Register a new user
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

// Login user
export const loginUser = async ({ email, password }) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password }, { headers: { "Content-Type": "application/json" } });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    if (response.data.refreshToken) {
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response.data;
  } catch (err) {
    console.error("Login error:", err.response?.data || err);
    throw err;
  }
};

// Refresh access token
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  try {
    const response = await axios.post(`${API_URL}/refresh`, { refreshToken }, { headers: { "Content-Type": "application/json" } });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      return response.data;
    }
    return null;
  } catch (err) {
    console.warn("Token refresh failed:", err.response?.data?.message || err.message);
    logoutUser();
    return null;
  }
};

// Logout
export const logoutUser = async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      await axios.post(`${API_URL}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.warn("Backend logout error:", err.response?.data || err);
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

// Get current user
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token found in localStorage. Using stored user fallback if available.");
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  }
  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    console.warn("Get current user failed, using fallback stored user:", err.response?.data || err.message);
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  }
};

// Update current user profile
export const updateCurrentUser = async (payload) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await axios.put(`${API_URL}/me`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const updatedUser = response.data?.user || null;
  if (updatedUser) {
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }

  return response.data;
};
