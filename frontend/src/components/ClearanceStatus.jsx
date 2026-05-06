import React, { useEffect, useState } from "react";

const RESOLVED_STATUSES = ["CLEARED", "PAID", "REGISTERED"];

const ClearanceStatus = ({ user, onResolveDepartment }) => {
  const [loading, setLoading] = useState(true);
  const [clearance, setClearance] = useState({});

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!user) return;

    const userId = user._id || user.id;
    if (!userId) return;

    const fetchClearance = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/clearance/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error(`Failed to fetch clearance: ${res.status}`);

        const data = await res.json();
        setClearance(data || {});
      } catch (err) {
        console.error("Clearance fetch error:", err.message);
        setClearance({});
      } finally {
        setLoading(false);
      }
    };

    fetchClearance();
  }, [user, token, API_URL]);

  if (!user) return null;

  return (
    <div className="rounded-xl bg-white p-3 shadow">
      <h3 className="mb-2 text-lg font-bold">My Clearance Status</h3>

      {loading ? (
        <p>Loading clearance status...</p>
      ) : Object.keys(clearance).length === 0 ? (
        <p className="text-gray-500">No clearance data available</p>
      ) : (
        <ul className="space-y-2">
          {Object.entries(clearance).map(([dept, data]) => {
            const status = data?.status || "PENDING";
            const isResolved = RESOLVED_STATUSES.includes(status);

            return (
              <li key={dept} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <span className="capitalize font-medium">{dept}</span>
                  <span className={`font-semibold ${isResolved ? "text-green-600" : "text-red-600"}`}>
                    {status}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1">{data?.note || data?.message || ""}</p>

                <button
                  type="button"
                  onClick={() => onResolveDepartment && onResolveDepartment(dept)}
                  disabled={isResolved}
                  className="text-sm text-blue-600 mt-1 hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {isResolved ? "Resolved" : "Resolve Now"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ClearanceStatus;
