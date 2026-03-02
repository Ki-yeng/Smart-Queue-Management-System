import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { logoutUser } from "../services/authService";
import {
  getAverageWaitTime,
  getDepartmentStats,
  getHourlyPeak,
  getOperationalMetrics,
  getStaffPerformance,
  getTicketsPerDay,
} from "../services/adminService";

const Card = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-sm font-semibold text-slate-700 mb-3">{title}</div>
    {children}
  </div>
);

const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
  </div>
);

const formatMinutesToHoursMins = (minutesValue) => {
  const totalMinutes = Number.isFinite(minutesValue) ? Math.max(0, Math.round(minutesValue)) : 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hrs ${minutes} mins`;
};

const AdminDashboard = () => {
  const [ticketsPerDay, setTicketsPerDay] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [averageWaitTime, setAverageWaitTime] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [hourlyPeak, setHourlyPeak] = useState([]);
  const [operationalMetrics, setOperationalMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [perDay, dept, wait, staff, hourly, ops] = await Promise.all([
        getTicketsPerDay(),
        getDepartmentStats(),
        getAverageWaitTime(),
        getStaffPerformance(),
        getHourlyPeak(),
        getOperationalMetrics(),
      ]);

      setTicketsPerDay(perDay);
      setDepartmentStats(dept);
      setAverageWaitTime(wait);
      setStaffPerformance(staff);
      setHourlyPeak(hourly);
      setOperationalMetrics(ops || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = ticketsPerDay.find((item) => item.day === today);
    const totalToday = todayRow?.totalTickets || 0;

    const totals = departmentStats.reduce(
      (acc, item) => {
        acc.completed += item.completed || 0;
        acc.pending += item.pending || 0;
        acc.total += item.total || 0;
        return acc;
      },
      { total: 0, completed: 0, pending: 0 }
    );

    const waitSummary = averageWaitTime.reduce(
      (acc, item) => {
        const samples = Number(item.samples || 0);
        acc.weighted += Number(item.avgWaitMinutes || 0) * samples;
        acc.samples += samples;
        return acc;
      },
      { weighted: 0, samples: 0 }
    );

    const avgWaitMinutes = waitSummary.samples > 0 ? waitSummary.weighted / waitSummary.samples : 0;
    const avgWaitAll = formatMinutesToHoursMins(avgWaitMinutes);

    return {
      totalToday,
      totalTickets: totals.total,
      completed: totals.completed,
      pending: totals.pending,
      avgWaitAll,
    };
  }, [ticketsPerDay, departmentStats, averageWaitTime]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Loading admin dashboard...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{error}</div>
          <button onClick={fetchDashboard} className="bg-slate-900 text-white px-4 py-2 rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Live analytics from MongoDB aggregation pipelines</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDashboard} className="border border-slate-300 px-3 py-2 rounded text-sm">
              Refresh
            </button>
            <button
              onClick={async () => {
                await logoutUser();
                window.location.href = "/";
              }}
              className="text-red-600 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Tickets Today" value={summary.totalToday} />
          <KpiCard label="Total Tickets (All Time)" value={summary.totalTickets} />
          <KpiCard label="Pending Tickets" value={summary.pending} />
          <KpiCard label="Average Wait" value={summary.avgWaitAll} />
          <KpiCard label="Pending Approvals" value={operationalMetrics.pendingApprovals || 0} />
          <KpiCard label="No-Show Rate" value={`${operationalMetrics.noShowRate || 0}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Tickets Per Day (Last 30 Days)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="totalTickets" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Hourly Peak Ticket Distribution">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyPeak}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="totalTickets" stroke="#0f766e" fill="#99f6e4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Department Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((department) => (
              <div key={department.department} className="bg-white rounded-xl shadow p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">{department.department || "Unassigned"}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Total</div>
                    <div className="font-semibold text-slate-900">{department.total || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Waiting</div>
                    <div className="font-semibold text-amber-600">{department.waiting || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Serving</div>
                    <div className="font-semibold text-blue-600">{department.serving || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Completed</div>
                    <div className="font-semibold text-emerald-600">{department.completed || 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card title="Staff Performance">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border border-slate-200 bg-slate-100 text-slate-700">
                  <th className="px-4 py-3 text-left font-semibold">Staff Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Tickets Served</th>
                  <th className="px-4 py-3 text-left font-semibold">Avg Service Time (mins)</th>
                </tr>
              </thead>
              <tbody className="border-x border-b border-slate-200">
                {staffPerformance.map((staff, index) => (
                  <tr key={`${staff.staffName}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 text-slate-800">{staff.staffName || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-700">{staff.ticketsServed || 0}</td>
                    <td className="px-4 py-3 text-slate-700">{staff.avgServiceMinutes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
