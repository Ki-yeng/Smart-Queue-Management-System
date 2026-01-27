import React, { useEffect, useState } from "react";
import { getCounters, addCounter, removeCounter } from "../../services/adminService";

const CounterManager = () => {
  const [counters, setCounters] = useState([]);
  const [name, setName] = useState("");
  const [service, setService] = useState("");

  const loadCounters = async () => {
    try {
      const data = await getCounters();
      setCounters(data);
    } catch (err) {
      console.error("Failed to load counters", err);
    }
  };

  useEffect(() => {
    loadCounters();
  }, []);

  const handleAdd = async () => {
    if (!name || !service) return alert("Fill all fields");
    await addCounter({ name, service });
    setName("");
    setService("");
    loadCounters();
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Remove this counter?")) return;
    await removeCounter(id);
    loadCounters();
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-xl font-bold mb-4">Counter Management</h3>

      {/* Add Counter */}
      <div className="flex gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Counter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Service Type"
          value={service}
          onChange={(e) => setService(e.target.value)}
        />
        <button
          onClick={handleAdd}
          className="bg-[#182B5C] text-white px-4 rounded"
        >
          Add
        </button>
      </div>

      {/* Counter List */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th>Name</th>
            <th>Service</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {counters.map((c) => (
            <tr key={c._id} className="border-b">
              <td>{c.name}</td>
              <td>{c.service}</td>
              <td className={c.active ? "text-green-600" : "text-gray-400"}>
                {c.active ? "Active" : "Inactive"}
              </td>
              <td>
                <button
                  onClick={() => handleRemove(c._id)}
                  className="text-red-600 text-xs"
                >
                  Remove
                </button>
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
