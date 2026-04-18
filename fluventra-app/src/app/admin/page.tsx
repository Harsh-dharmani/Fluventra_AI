"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  adminLogin,
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
  const [adminToken, setAdminToken] = useState("");
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
    if (s?.adminToken) {
      setAdminToken(s.adminToken);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchCodes = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await adminGetCodes(adminToken);
      setCodes(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => {
    if (isLoggedIn) fetchCodes();
  }, [isLoggedIn, fetchCodes]);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError("");
    try {
      const data = await adminLogin({ adminId, adminPassword });
      setAdminToken(data.token);
      setAdminSession({ adminToken: data.token });
      setIsLoggedIn(true);
      setAdminPassword("");
    } catch { setLoginError("Invalid credentials. Please try again."); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    clearAdminSession(); setIsLoggedIn(false);
    setAdminToken(""); setAdminId(""); setAdminPassword("");
  };

  const handleGenerate = async () => {
    if (!studentName.trim()) return;
    setGenerating(true); setNewCode("");
    try {
      const data = await adminGenerateCode(adminToken, { studentName, course, durationDays });
      setNewCode(data.code); setStudentName(""); fetchCodes();
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const handleToggle = async (code: string, currentStatus: boolean) => {
    try { await adminToggleCodeStatus(adminToken, code, !currentStatus); fetchCodes(); }
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
      <main className="flex-1 flex items-center justify-center p-6 bg-gray-50/30">
        <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-2xl rounded-3xl border border-gray-200/50 shadow-sm p-8 sm:p-12">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
              <Image src="/logo.png" alt="Fluventra" width={32} height={32} />
            </div>
            <h1 className="text-[1.35rem] font-semibold text-gray-900 tracking-tight">Admin Console</h1>
            <p className="text-[0.95rem] text-gray-500">Sign in to manage access codes</p>
          </div>

          {/* Form */}
          <div className="space-y-5 mb-8">
            <div className="space-y-2">
              <label htmlFor="admin-id" className="block text-[0.85rem] font-medium text-gray-600">Admin ID</label>
              <input
                id="admin-id"
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 text-[0.95rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                placeholder="Enter admin ID"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-[0.85rem] font-medium text-gray-600">Password</label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full h-12 px-4 rounded-xl border border-gray-200/80 bg-gray-50/50 text-[0.95rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                placeholder="Enter password"
              />
            </div>
          </div>

          {loginError && (
            <div className="mb-6 text-[0.9rem] text-red-600 bg-red-50/50 rounded-xl px-4 py-3 border border-red-100">
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading || !adminId || !adminPassword}
            className={`w-full h-12 rounded-xl bg-gray-900 text-white font-medium text-[0.95rem] hover:bg-gray-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
    <main className="flex-1 w-full bg-gray-50/30">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 pb-24 flex flex-col gap-8 sm:gap-12 w-full">

        {/* ── Header ───────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
              <Image src="/logo.png" alt="Fluventra" width={24} height={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Admin Console</h1>
              <p className="text-[0.95rem] text-gray-500 mt-1">
                Manage student access codes
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center h-10 px-5 rounded-lg text-[0.9rem] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all self-start sm:self-auto"
          >
            Log out
          </button>
        </header>

        {/* ── Stat Chips ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-white/90 backdrop-blur-2xl border border-gray-200/60 rounded-[2rem] shadow-sm p-8 flex flex-col justify-center">
            <p className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Total Codes</p>
            <p className="text-4xl font-semibold text-gray-900 tracking-tight">{codes.length}</p>
          </div>
          <div className="bg-white/90 backdrop-blur-2xl border border-gray-200/60 rounded-[2rem] shadow-sm p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
            <p className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 relative z-10">Active</p>
            <p className="text-4xl font-semibold text-emerald-600 tracking-tight relative z-10">{activeCodes}</p>
          </div>
          <div className="bg-white/90 backdrop-blur-2xl border border-gray-200/60 rounded-[2rem] shadow-sm p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gray-500/10 blur-3xl rounded-full"></div>
            <p className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 relative z-10">Paused</p>
            <p className="text-4xl font-semibold text-gray-800 tracking-tight relative z-10">{codes.length - activeCodes}</p>
          </div>
        </div>

        {/* ── Generate Code ───────────────────── */}
        <section className="bg-white/90 backdrop-blur-2xl border border-gray-200/60 rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-10 w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-8">Generate New Code</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4 w-full space-y-2">
              <label htmlFor="student-name" className="block text-[0.85rem] font-semibold text-gray-600 uppercase tracking-wider">Student Name</label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full h-14 px-5 rounded-2xl border border-gray-200/80 bg-gray-50/50 text-[1rem] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="e.g., Harsh"
              />
            </div>
            <div className="md:col-span-4 w-full space-y-2">
              <label htmlFor="course-select" className="block text-[0.85rem] font-semibold text-gray-600 uppercase tracking-wider">Course</label>
              <select
                id="course-select"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full h-14 px-5 rounded-2xl border border-gray-200/80 bg-gray-50/50 text-[1rem] text-gray-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              >
                <option>Fluventra Speak</option>
                <option>Fluventra Global</option>
                <option>Fluventra Career</option>
                <option>Fluventra Pro</option>
              </select>
            </div>
            <div className="md:col-span-2 w-full space-y-2">
              <label htmlFor="days-input" className="block text-[0.85rem] font-semibold text-gray-600 uppercase tracking-wider">Days</label>
              <input
                id="days-input"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                min={1}
                className="w-full h-14 px-5 rounded-2xl border border-gray-200/80 bg-gray-50/50 text-[1rem] text-gray-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
            </div>
            <div className="md:col-span-2 w-full">
              <button
                onClick={handleGenerate}
                disabled={generating || !studentName.trim()}
                className={`h-14 w-full rounded-2xl bg-gray-900 text-white font-semibold text-[0.95rem] hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed`}
              >
                {generating ? "..." : "Generate"}
              </button>
            </div>
          </div>

          {/* New Code Result */}
          {newCode && (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50 border border-indigo-200/60 rounded-2xl p-6">
              <div className="space-y-1">
                <p className="text-[0.75rem] font-bold text-indigo-600 uppercase tracking-[0.1em]">New Session Code Created</p>
                <p className="text-3xl font-bold text-indigo-700 tracking-[0.2em] font-mono">{newCode}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(newCode)}
                className="flex items-center justify-center h-10 px-5 rounded-xl text-[0.9rem] font-bold text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 border border-indigo-200 transition-all sm:self-center"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </section>

        {/* ── Codes Table ─────────────────────── */}
        <section className="bg-white/90 backdrop-blur-2xl border border-gray-200/60 rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden w-full relative">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-cyan-500 via-emerald-500 to-green-500"></div>
          {/* Table Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">All Codes</h2>
            <button
              onClick={fetchCodes}
              disabled={loading}
              className="flex items-center justify-center h-10 px-4 rounded-xl text-[0.85rem] font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-200 hover:border-gray-300"
            >
              {loading ? "Refreshing" : "↻ Refresh Table"}
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {codes.map((c) => (
              <div key={c.code} className="px-6 py-5 space-y-4 bg-white/50 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[1rem] font-semibold text-gray-800 tracking-wider font-mono">
                    {c.code}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[0.75rem] font-semibold tracking-wide ${
                    c.isActive
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                      : "bg-gray-100 text-gray-500 border border-gray-200/50"
                  }`}>
                    {c.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.95rem] text-gray-600">{c.studentName}</p>
                  <div className="flex items-center justify-between text-[0.85rem] text-gray-400">
                    <span>{c.course}</span>
                    <span>{formatDate(c.createdAt)} → {formatDate(c.expiresAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(c.code, c.isActive)}
                  className={`flex items-center justify-center w-full h-10 rounded-xl text-[0.85rem] font-medium transition-all ${
                    c.isActive
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                  }`}
                >
                  {c.isActive ? "Pause Access" : "Resume Access"}
                </button>
              </div>
            ))}
            {codes.length === 0 && !loading && (
              <div className="px-6 py-16 text-center text-[0.95rem] text-gray-400">
                No codes generated yet.
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-8 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Code</th>
                  <th className="px-6 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Student</th>
                  <th className="px-6 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Course</th>
                  <th className="px-6 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Created</th>
                  <th className="px-6 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Expires</th>
                  <th className="px-6 py-5 text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Status</th>
                  <th className="px-8 py-5 text-right text-[0.75rem] font-bold text-gray-500 uppercase tracking-[0.1em]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {codes.map((c) => (
                  <tr key={c.code} className="hover:bg-gray-50/80 transition-colors group bg-white/70">
                    <td className="px-8 py-6 font-mono text-[1rem] font-bold text-gray-900 tracking-wider">
                      {c.code}
                    </td>
                    <td className="px-6 py-6 text-[0.95rem] font-medium text-gray-700">{c.studentName}</td>
                    <td className="px-6 py-6 text-[0.95rem] text-gray-600">{c.course}</td>
                    <td className="px-6 py-6 text-[0.9rem] text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-6 text-[0.9rem] text-gray-500">{formatDate(c.expiresAt)}</td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[0.75rem] font-bold tracking-wide uppercase ${
                        c.isActive
                          ? "bg-emerald-100/50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200/80"
                      }`}>
                        {c.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleToggle(c.code, c.isActive)}
                        className={`inline-flex items-center justify-center h-9 px-5 rounded-xl text-[0.8rem] font-bold transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm ${
                          c.isActive
                            ? "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80 hover:border-gray-300"
                            : "bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600/50 hover:shadow-md"
                        }`}
                      >
                        {c.isActive ? "Pause" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center text-gray-500 bg-white/50 text-lg">
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
