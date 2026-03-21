import React, { useEffect, useState } from "react";
import { createCounter, getCounters, updateStatus } from "../../services/counterService";

const CounterManager = () => {
  const [counters, setCounters] = useState([]);
  const [counterName, setCounterName] = useState("");
  const [serviceType, setServiceType] = useState("Admissions");
  const [saving, setSaving] = useState(false);

  const loadCounters = async () => {
    try {
      const data = await getCounters();
      setCounters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load counters", err);
    }
  };

  useEffect(() => {
    loadCounters();
  }, []);

  const handleAdd = async () => {
    if (!counterName || !serviceType) return alert("Fill all fields");
    setSaving(true);
    try {
      await createCounter({ counterName, serviceType });
      setCounterName("");
      await loadCounters();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create counter");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus(id, status);
      await loadCounters();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update counter status");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-xl font-bold mb-4">Counter Management</h3>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Counter Name"
          value={counterName}
          onChange={(e) => setCounterName(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 flex-1"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
        >
          <option>Admissions</option>
          <option>Finance</option>
          <option>Examinations</option>
          <option>Library</option>
          <option>Accommodation</option>
          <option>Student Records</option>
          <option>ICT Support</option>
          <option>Counselling</option>
          <option>General Enquiries</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-[#182B5C] text-white px-4 rounded disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add"}
        </button>
        <button onClick={loadCounters} className="border px-4 rounded">
          Refresh
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th>Name</th>
            <th>Service Type</th>
            <th>Status</th>
            <th>Set Status</th>
          </tr>
        </thead>
        <tbody>
          {counters.map((c) => (
            <tr key={c._id} className="border-b">
              <td>{c.counterName}</td>
              <td>{c.serviceType}</td>
              <td className={c.status === "open" ? "text-green-600" : c.status === "busy" ? "text-amber-600" : "text-gray-500"}>
                {c.status}
              </td>
              <td>
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c._id, e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="open">open</option>
                  <option value="busy">busy</option>
                  <option value="closed">closed</option>
                </select>
              </td>
            </tr>
          ))}
          {counters.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center text-gray-500 py-4">
                No counters found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CounterManager;
