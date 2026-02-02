// src/components/ClearanceStatus.jsx
import React, { useEffect, useState } from "react";

const ClearanceStatus = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [clearance, setClearance] = useState({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!user) return;

    const userId = user._id || user.id;
    if (!userId) return;

    const fetchClearance = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:5000/api/clearance/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch clearance: ${res.status}`);

        const data = await res.json();
        setClearance(data);
      } catch (err) {
        console.error("Clearance fetch error:", err.message);

        // Optional fallback for development
        setClearance({
          finance: { status: "Paid" },
          academics: { status: "Registered" },
          examinations: { status: "Eligible" },
          library: { status: "Cleared" },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClearance();
  }, [user, token]);

  if (!user) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="font-bold text-xl mb-3">Clearance Status</h3>

      {loading ? (
        <p>Loading clearance status...</p>
      ) : Object.keys(clearance).length === 0 ? (
        <p className="text-gray-500">No clearance data available</p>
      ) : (
        <ul className="space-y-1">
          {Object.entries(clearance).map(([dept, statusObj]) => (
            <li
              key={dept}
              className="flex justify-between border-b py-1"
            >
              <span className="capitalize">{dept}</span>
              <span
                className={`font-semibold ${
                  ["cleared", "paid", "eligible"].includes(
                    statusObj.status.toLowerCase()
                  )
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {statusObj.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClearanceStatus;
