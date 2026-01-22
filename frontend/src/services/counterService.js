import axios from "axios";

const API_URL = "http://localhost:5000/api/counters";

// Create counter
export const createCounter = async (counterData) => {
  const response = await axios.post(API_URL, counterData);
  return response.data;
};

// Assign service type
export const assignServiceType = async (counterId, serviceType) => {
  const response = await axios.put(`${API_URL}/${counterId}/services`, { serviceType });
  return response.data;
};

// Open / close counter
export const updateStatus = async (counterId, status) => {
  const response = await axios.put(`${API_URL}/${counterId}/status`, { status });
  return response.data;
};

// Get current ticket
export const getCurrentTicket = async (counterId) => {
  const response = await axios.get(`${API_URL}/${counterId}/current`);
  return response.data;
};
// ===== LOAD BALANCING ENDPOINTS =====

/**
 * Get load balancing dashboard with real-time metrics
 */
export const getLoadBalancingDashboard = async () => {
  const response = await axios.get(`${API_URL}/load-balancing/dashboard`);
  return response.data;
};

/**
 * Get counters sorted by current load
 * @param {string} serviceType - Optional service type filter
 */
export const getCountersByLoad = async (serviceType = null) => {
  const params = serviceType ? { serviceType } : {};
  const response = await axios.get(`${API_URL}/load-balancing/by-load`, { params });
  return response.data;
};

/**
 * Get best counter recommendation for a ticket
 * @param {string} serviceType - Service type needed
 * @param {string} priority - Ticket priority level
 */
export const getBestCounterForTicket = async (serviceType, priority = 'normal') => {
  const response = await axios.get(`${API_URL}/load-balancing/best-counter`, {
    params: { serviceType, priority }
  });
  return response.data;
};

/**
 * Get load rebalancing suggestions
 * @param {number} threshold - Load score threshold for overloaded counters
 */
export const getLoadRebalancingSuggestions = async (threshold = 70) => {
  const response = await axios.get(`${API_URL}/load-balancing/suggestions`, {
    params: { threshold }
  });
  return response.data;
};

export default {
  createCounter,
  assignServiceType,
  updateStatus,
  getCurrentTicket,
  getLoadBalancingDashboard,
  getCountersByLoad,
  getBestCounterForTicket,
  getLoadRebalancingSuggestions,
};