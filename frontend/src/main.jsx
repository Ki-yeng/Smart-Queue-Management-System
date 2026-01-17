import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import setupAxiosInterceptors from "./services/axiosInterceptor.js";

// Setup axios interceptors for automatic token refresh
setupAxiosInterceptors();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
