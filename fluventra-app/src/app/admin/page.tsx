"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  adminGetCodes,
  adminGenerateCode,
  adminToggleCodeStatus,
} from "@/lib/api";
import {
  getAdminSession,
  setAdminSession,
  clearAdminSession,
} from "@/lib/session";

interface CodeEntry {
  code: string;
  studentName: string;
  course: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [course, setCourse] = useState("Fluventra Speak");
  const [durationDays, setDurationDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    const s = getAdminSession();
    if (s) {
      setAdminId(s.adminId);
      setAdminPassword(s.adminPassword);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetCodes(adminId, adminPassword);
      setCodes(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminId, adminPassword]);

  useEffect(() => {
    if (isLoggedIn) fetchCodes();
  }, [isLoggedIn, fetchCodes]);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError("");
    try {
      await adminGetCodes(adminId, adminPassword);
      setAdminSession({ adminId, adminPassword });
      setIsLoggedIn(true);
    } catch { setLoginError("Invalid credentials. Please try again."); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    clearAdminSession(); setIsLoggedIn(false);
    setAdminId(""); setAdminPassword("");
  };

  const handleGenerate = async () => {
    if (!studentName.trim()) return;
    setGenerating(true); setNewCode("");
    try {
      const data = await adminGenerateCode(adminId, adminPassword, { studentName, course, durationDays });
      setNewCode(data.code); setStudentName(""); fetchCodes();
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const handleToggle = async (code: string, currentStatus: boolean) => {
    try { await adminToggleCodeStatus(adminId, adminPassword, code, !currentStatus); fetchCodes(); }
    catch { /* ignore */ }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const activeCodes = codes.filter((c) => c.isActive).length;

  /* ════════════════════════════════════════════
     LOGIN SCREEN
  ════════════════════════════════════════════ */
  if (!isLoggedIn) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="admin-card w-full max-w-[400px] rounded-2xl p-8 sm:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt="Fluventra" width={48} height={48} className="mb-4" />
            <h1 className="text-xl font-semibold text-gray-800">Admin Console</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to manage access codes</p>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="admin-id" className="admin-label">Admin ID</label>
              <input
                id="admin-id"
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="admin-input"
                placeholder="Enter admin ID"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="admin-label">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="admin-input"
                placeholder="Enter password"
              />
            </div>
          </div>

          {loginError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-100">
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading || !adminId || !adminPassword}
            className={`admin-btn-primary w-full h-12 text-sm ${loginLoading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {loginLoading ? "Verifying..." : "Sign In"}
          </button>
        </div>
      </main>
    );
  }

  /* ════════════════════════════════════════════
     DASHBOARD
  ════════════════════════════════════════════ */
  return (
    <main className="flex-1 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── Header ───────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Fluventra" width={32} height={32} />
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Admin Console</h1>
              <p className="text-sm text-gray-400 mt-0.5 hidden sm:block">
                Manage student access codes
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="admin-btn-ghost text-sm self-start sm:self-auto"
          >
            Log out
          </button>
        </header>

        {/* ── Stat Chips ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="admin-card rounded-xl px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Codes</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{codes.length}</p>
          </div>
          <div className="admin-card rounded-xl px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">{activeCodes}</p>
          </div>
          <div className="admin-card rounded-xl px-5 py-4 hidden sm:block">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Paused</p>
            <p className="text-2xl font-semibold text-gray-400 mt-1">{codes.length - activeCodes}</p>
          </div>
        </div>

        {/* ── Generate Code ───────────────────── */}
        <section className="admin-card rounded-2xl p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-6">Generate New Code</h2>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="student-name" className="admin-label">Student Name</label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="admin-input"
                placeholder="e.g., Harsh"
              />
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="course-select" className="admin-label">Course</label>
              <select
                id="course-select"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="admin-input"
              >
                <option>Fluventra Speak</option>
                <option>Fluventra Global</option>
                <option>Fluventra Career</option>
                <option>Fluventra Pro</option>
              </select>
            </div>
            <div className="w-full md:w-28">
              <label htmlFor="days-input" className="admin-label">Days</label>
              <input
                id="days-input"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                min={1}
                className="admin-input"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !studentName.trim()}
              className={`admin-btn-primary h-12 px-8 text-sm whitespace-nowrap w-full md:w-auto ${generating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {generating ? "Creating..." : "Generate"}
            </button>
          </div>

          {/* New Code Result */}
          {newCode && (
            <div className="mt-6 flex items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">New Code Created</p>
                <p className="text-2xl font-bold text-emerald-700 tracking-[0.2em] mt-1 font-mono">{newCode}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(newCode)}
                className="admin-btn-ghost text-emerald-600 hover:text-emerald-800 text-sm flex-shrink-0"
              >
                📋 Copy
              </button>
            </div>
          )}
        </section>

        {/* ── Codes Table ─────────────────────── */}
        <section className="admin-card rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-800">All Codes</h2>
            <button
              onClick={fetchCodes}
              disabled={loading}
              className="admin-btn-ghost text-sm"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-gray-50">
            {codes.map((c) => (
              <div key={c.code} className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 tracking-wider font-mono">
                    {c.code}
                  </span>
                  <span className={`admin-badge ${c.isActive ? "admin-badge-active" : "admin-badge-paused"}`}>
                    {c.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{c.studentName} · {c.course}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(c.createdAt)} → {formatDate(c.expiresAt)}
                </p>
                <button
                  onClick={() => handleToggle(c.code, c.isActive)}
                  className={`text-xs font-medium w-full py-2 rounded-lg transition-colors cursor-pointer ${
                    c.isActive
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  {c.isActive ? "Pause" : "Resume"}
                </button>
              </div>
            ))}
            {codes.length === 0 && !loading && (
              <div className="px-6 py-16 text-center text-sm text-gray-400">
                No codes generated yet.
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="admin-th">Code</th>
                  <th className="admin-th">Student</th>
                  <th className="admin-th">Course</th>
                  <th className="admin-th">Created</th>
                  <th className="admin-th">Expires</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {codes.map((c) => (
                  <tr key={c.code} className="hover:bg-gray-50/60 transition-colors">
                    <td className="admin-td font-mono font-semibold text-gray-700 tracking-wider">
                      {c.code}
                    </td>
                    <td className="admin-td text-gray-600">{c.studentName}</td>
                    <td className="admin-td text-gray-500">{c.course}</td>
                    <td className="admin-td text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="admin-td text-gray-400 text-xs">{formatDate(c.expiresAt)}</td>
                    <td className="admin-td">
                      <span className={`admin-badge ${c.isActive ? "admin-badge-active" : "admin-badge-paused"}`}>
                        {c.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="admin-td text-right">
                      <button
                        onClick={() => handleToggle(c.code, c.isActive)}
                        className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          c.isActive
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {c.isActive ? "Pause" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                      No codes generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
