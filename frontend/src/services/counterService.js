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
