import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword, loginUser, resetPassword } from "../services/authService";
import logo from "../assets/images/KCAU_logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await loginUser({ email, password });

      // Redirect based on role
      if (data.user.role === "admin") navigate("/admin");
      else if (data.user.role === "staff") navigate("/staff");
      else navigate("/student");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await forgotPassword(resetEmail);
      setMessage(data?.message || "Reset token generated.");
      if (data?.resetToken) setResetToken(data.resetToken);
      setMode("reset");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to generate reset token");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await resetPassword({ token: resetToken, password: newPassword });
      setMessage(data?.message || "Password reset successful.");
      setNewPassword("");
      setResetToken("");
      setMode("login");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to reset password");
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

      {/* Login Card */}
      <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#182B5C]">
            KCAU Smart Queue
          </h1>
          <p className="text-sm text-gray-500">
            Sign in to access your dashboard
          </p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@student.kca.ac.ke"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 text-white rounded-md transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#182B5C] hover:bg-[#121f42]"
              }`}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="you@student.kca.ac.ke"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 text-white rounded-md transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#182B5C] hover:bg-[#121f42]"
              }`}
            >
              {loading ? "Sending..." : "Send Reset Token"}
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reset Token
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                placeholder="Paste reset token"
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="********"
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#182B5C]"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 text-white rounded-md transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#182B5C] hover:bg-[#121f42]"
              }`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {/* Forgot Password */}
        <div className="mt-4 text-center space-y-2">
          {mode === "login" && (
            <button
              type="button"
              className="text-sm text-[#182B5C] hover:underline"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          )}
          {mode !== "login" && (
            <button
              type="button"
              className="text-sm text-[#182B5C] hover:underline"
              onClick={() => setMode("login")}
            >
              Back to sign in
            </button>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="text-sm text-[#182B5C] hover:underline"
              onClick={() => navigate("/register")}
            >
              Sign up
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          KCAU Smart Queue System
        </p>
      </div>
    </div>
  );
};

export default Login;
