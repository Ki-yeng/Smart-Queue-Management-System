import { useEffect, useState } from "react";
import { getCurrentUser, updateCurrentUser } from "../../services/authService";

const YEAR_OPTIONS = ["First Year", "Second Year", "Third Year", "Final Year", "Postgraduate"];

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    registrationNumber: "",
    program: "",
    studentYear: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        const user = me?.user || me || {};
        setForm({
          name: user?.name || "",
          email: user?.email || "",
          registrationNumber: user?.registrationNumber || user?.studentNumber || "",
          program: user?.program || user?.course || "",
          studentYear: user?.studentYear || "",
        });
      } catch {
        setMessage("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        name: form.name.trim(),
        registrationNumber: form.registrationNumber.trim(),
        program: form.program.trim(),
        studentYear: form.studentYear || null,
      };
      await updateCurrentUser(payload);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading profile...</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-[#182B5C]">My Profile</h2>

      <form onSubmit={onSubmit} className="mt-4 bg-white p-4 rounded shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={form.email} className="w-full border rounded p-2 bg-gray-50" disabled />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Registration Number</label>
          <input
            type="text"
            value={form.registrationNumber}
            onChange={(e) => onChange("registrationNumber", e.target.value)}
            className="w-full border rounded p-2"
            placeholder="e.g BIT/1234/2023"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Program</label>
          <input
            type="text"
            value={form.program}
            onChange={(e) => onChange("program", e.target.value)}
            className="w-full border rounded p-2"
            placeholder="e.g Bachelor of Information Technology"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select
            value={form.studentYear}
            onChange={(e) => onChange("studentYear", e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Select year</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={saving} className="bg-[#182B5C] text-white px-4 py-2 rounded disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>
    </div>
  );
};

export default Profile;
