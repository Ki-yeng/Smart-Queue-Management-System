import React from "react";

const KPIPanel = ({ loading, kpi }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-500">Loading system KPIs…</p>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-red-600">
        Failed to load KPIs
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KPI title="Active Counters" value={kpi.activeCounters} />
      <KPI title="Waiting Tickets" value={kpi.waitingTickets} />
      <KPI title="Avg Wait (mins)" value={kpi.avgWaitTime} />
      <KPI title="Tickets Served Today" value={kpi.servedToday} />
    </div>
  );
};

const KPI = ({ title, value }) => (
  <div className="bg-white rounded-xl shadow p-5">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-2xl font-bold text-[#182B5C] mt-1">
      {value ?? "—"}
    </div>
  </div>
);

export default KPIPanel;
