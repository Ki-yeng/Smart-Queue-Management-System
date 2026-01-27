// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";

const Navbar = () => {
  const navigate = useNavigate();

  // Get user from localStorage (synchronous)
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    logoutUser();      // clear tokens
    navigate("/");     // redirect to login
  };

  return (
    <nav
      style={{
        padding: "10px 20px",
        background: "#4f46e5",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>KCAU Smart Queue</span>
      {user && (
        <button
          onClick={handleLogout}
          style={{
            background: "#fff",
            color: "#4f46e5",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
};

export default Navbar;
