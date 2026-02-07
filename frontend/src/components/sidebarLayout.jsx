// src/components/SidebarLayout.jsx
import { Link } from "react-router-dom";

const SidebarLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
     
      {/* Main content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
};

export default SidebarLayout;
