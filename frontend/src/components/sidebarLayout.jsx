// src/components/SidebarLayout.jsx
import { Link } from "react-router-dom";

const SidebarLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white p-6 space-y-4">
        <h2 className="text-xl font-bold mb-6">Student Services</h2>
        <nav className="space-y-2">
          <Link to="/services/fees" className="block hover:underline">Check Fee Balance</Link>
          <Link to="/services/ticket" className="block hover:underline">Generate Ticket</Link>
          <Link to="/services/status" className="block hover:underline">View Status</Link>
          <Link to="/services/exams" className="block hover:underline">Exam Eligibility</Link>
          <Link to="/services/upload" className="block hover:underline">Upload Documents</Link>
          <Link to="/services/clearance" className="block hover:underline">Request Clearance</Link>
          <Link to="/services/notifications" className="block hover:underline">Notifications</Link>
          <Link to="/services/profile" className="block hover:underline">Profile</Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
};

export default SidebarLayout;
