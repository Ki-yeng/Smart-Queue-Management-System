import axios from "axios";
import { refreshAccessToken } from "./authService";

/**
 * Axios response interceptor for automatic token refresh
 * When 401 is received and refresh token exists:
 * 1. Calls refresh endpoint
 * 2. Retries original request with new token
 * 3. If refresh fails, redirects to login
 */
export const setupAxiosInterceptors = () => {
  // Track if we're already refreshing to avoid multiple refresh attempts
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    isRefreshing = false;
    failedQueue = [];
  };

  // Response interceptor
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Check if it's a 401 and we haven't already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue the request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return axios(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const result = await refreshAccessToken();
          
          if (result && result.token) {
            // Update authorization header
            const newToken = result.token;
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

            // Update all queued requests
            processQueue(null, newToken);

            // Retry original request with new token
            return axios(originalRequest);
          } else {
            // Refresh failed, will logout user
            processQueue(error, null);
            throw error;
          }
        } catch (err) {
          processQueue(err, null);
          // Redirect to login on refresh failure
          window.location.href = "/";
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
