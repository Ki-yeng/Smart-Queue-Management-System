// src/components/ClearanceStatus.jsx
import React, { useEffect, useState } from "react";

/**
 * =========================================
 * 🟢 STEP 1: CLEARANCE STATUS PANEL
 * -----------------------------------------
 * Visibility ONLY.
 * No blocking.
 * No smart routing.
 * =========================================
 */

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

        if (!res.ok)
          throw new Error(`Failed to fetch clearance: ${res.status}`);

        const data = await res.json();
        setClearance(data);
      } catch (err) {
        console.error("Clearance fetch error:", err.message);

        // 🔹 DEV FALLBACK (VISIBILITY ONLY)
        setClearance({
          finance: {
            status: "PENDING",
            message: "Outstanding fee balance detected",
          },
          academics: {
            status: "REGISTERED",
            message: "All required units registered",
          },
          examinations: {
            status: "BLOCKED",
            message: "Exam access blocked due to pending fees",
          },
          library: {
            status: "CLEARED",
            message: "No pending library books",
          },
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
      <h3 className="font-bold text-xl mb-3">
        My Clearance Status
      </h3>

      {loading ? (
        <p>Loading clearance status...</p>
      ) : Object.keys(clearance).length === 0 ? (
        <p className="text-gray-500">
          No clearance data available
        </p>
      ) : (
        <ul className="space-y-2">
          {Object.entries(clearance).map(([dept, data]) => {
            const okStatuses = ["CLEARED", "PAID", "REGISTERED"];
            const isOk = okStatuses.includes(data.status);

            return (
              <li
                key={dept}
                className="border-b pb-2"
              >
                <div className="flex justify-between items-center">
                  <span className="capitalize font-medium">
                    {dept}
                  </span>

                  <span
                    className={`font-semibold ${
                      isOk
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.status}
                  </span>
                </div>

                {/* 🔹 Explanation (ROOT CAUSE) */}
                <p className="text-sm text-gray-500 mt-1">
                  {data.message}
                </p>

                {/* 🔹 Placeholder Action */}
                <button
                  className="text-sm text-blue-600 mt-1 hover:underline"
                  onClick={() =>
                    console.log(
                      `Resolve ${dept} clicked`
                    )
                  }
                >
                  Resolve Now
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
