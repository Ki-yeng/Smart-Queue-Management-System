import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ role, children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;

  // Logged in but wrong role → redirect to correct dashboard
  if (user.role !== role) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    if (user.role === "student") return <Navigate to="/student" replace />;
  }

  // Correct role → render children
  return children;
};

export default ProtectedRoute;
