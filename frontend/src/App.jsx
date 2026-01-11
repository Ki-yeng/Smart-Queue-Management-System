import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import CustomerPage from "./pages/CustomerPage";

// Student feature pages
import FeeBalance from "./pages/student/FeeBalance";
import GenerateTicket from "./pages/student/GenerateTicket";
import TicketStatus from "./pages/student/TicketStatus";
import ExamEligibility from "./pages/student/ExamEligibility";
import UploadDocuments from "./pages/student/UploadDocuments";
import ClearanceRequest from "./pages/student/ClearanceRequest";
import Notifications from "./pages/student/Notifications";
import Profile from "./pages/student/Profile";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Staff */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute role="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Student Main Dashboard */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <CustomerPage />
            </ProtectedRoute>
          }
        />

        {/* Student Sub Pages */}
        <Route
          path="/student/fees"
          element={
            <ProtectedRoute role="student">
              <FeeBalance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/ticket"
          element={
            <ProtectedRoute role="student">
              <GenerateTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/status"
          element={
            <ProtectedRoute role="student">
              <TicketStatus />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/exam-eligibility"
          element={
            <ProtectedRoute role="student">
              <ExamEligibility />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/upload-docs"
          element={
            <ProtectedRoute role="student">
              <UploadDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/clearance"
          element={
            <ProtectedRoute role="student">
              <ClearanceRequest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute role="student">
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute role="student">
              <Profile />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}
