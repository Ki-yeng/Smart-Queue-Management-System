// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService"; // Use centralized auth service
import logo from "../assets/images/KCAU_logo.png";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await registerUser(formData); // Use authService
      setMessage(res.message || "Registration successful!");
      setFormData({ name: "", email: "", password: "" });
      setTimeout(() => navigate("/"), 1500); // Redirect to login
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background Logo */}
      <img
        src={logo}
        alt="KCAU Logo"
        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
      />

      {/* Register Card */}
      <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#182B5C]">KCAU Smart Queue</h1>
          <p className="text-sm text-gray-500">Create your student account</p>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-3">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@student.kca.ac.ke"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C] pr-20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#182B5C] hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 border-gray-300 text-[#182B5C] focus:ring-[#182B5C]"
            />
            <span>
              I agree to the{" "}
              <a href="#terms" className="text-[#182B5C] hover:underline">
                Terms & Privacy Policy
              </a>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 text-white rounded-md transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#182B5C] hover:bg-[#121f42]"
            }`}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            type="button"
            className="text-sm text-[#182B5C] hover:underline"
            onClick={() => navigate("/")}
          >
            Back to sign in
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">KCAU Smart Queue System</p>

        <div id="terms" className="mt-5 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-2">Terms & Privacy Policy</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the system only for legitimate university services.</li>
            <li>Do not share your login credentials with others.</li>
            <li>Your data is used to manage queues and service delivery.</li>
            <li>We may store your ticket history and feedback for quality improvement.</li>
            <li>Accounts that misuse the system may be suspended.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
