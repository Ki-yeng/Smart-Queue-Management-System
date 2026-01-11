import axios from "axios";

const API_URL = "http://localhost:5000/api/tickets";

/**
 * Create a new ticket
 * @param {string} serviceType
 */
export const createTicket = async (serviceType) => {
  const response = await axios.post(`${API_URL}/create`, {
    serviceType,
  });
  return response.data;
};

/**
 * Get next ticket for a service
 * @param {string} serviceType
 */
export const getNextTicket = async (serviceType) => {
  const response = await axios.get(
    `${API_URL}/next?serviceType=${serviceType}`
  );
  return response.data;
};
