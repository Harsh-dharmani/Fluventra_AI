"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getStudentSession, clearStudentSession, type StudentSession } from "@/lib/session";
import { getStudentHistory } from "@/lib/api";
import AnalysisReport from "@/components/AnalysisReport";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudentSession | null>(null);
  
  const [view, setView] = useState<"dashboard" | "history">("dashboard");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    const s = getStudentSession();
    if (!s || !s.code) { /* Auto logout if they have the old session format missing the code */
      clearStudentSession();
      router.replace("/");
      return;
    }
    setSession(s);
  }, [router]);

  const handleLogout = () => {
    clearStudentSession();
    router.push("/");
  };

  const handleLoadHistory = async () => {
    if (!session) return;
    setIsLoadingHistory(true);
    setView("history");
    setSelectedReport(null);
    try {
      const res = await getStudentHistory(session.code, session.token);
      setHistoryData(res.data || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="w-full max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Fluventra" width={36} height={36} />
            <h1 className="text-lg sm:text-xl font-bold gradient-text tracking-wide">
              FLUVENTRA
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs sm:text-sm text-gray-400 hover:text-purple transition-colors cursor-pointer"
          >
            Exit Academy →
          </button>
        </div>

        {view === "history" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                Your Progress
              </h2>
              <button
                onClick={() => { setView("dashboard"); setSelectedReport(null); }}
                className="text-sm font-semibold px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-700 cursor-pointer"
              >
                ← Back
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-12 text-gray-400">Loading history...</div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 premium-card rounded-2xl">
                <p className="text-gray-400">No past sessions found. Start talking!</p>
              </div>
            ) : selectedReport ? (
              <div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="mb-4 text-xs sm:text-sm text-gray-400 hover:text-purple cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to List
                </button>
                <div className="text-sm text-gray-500 mb-2">
                  Session recorded on {new Date(selectedReport.date).toLocaleDateString()}
                </div>
                <AnalysisReport data={selectedReport.report} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyData.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    onClick={() => setSelectedReport(item)}
                    className="premium-card card-hover rounded-2xl p-5 text-left flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className={`text-sm font-extrabold ${item.report.fluency_score >= 7 ? 'text-green-500' : 'text-yellow-500'} bg-black/5 px-2 py-1 rounded-md`}>
                          Score: {item.report.fluency_score}/10
                        </span>
                      </div>
                      <h3 className="text-gray-800 font-bold capitalize">
                        {item.mode} Mode
                      </h3>
                      <p className="text-gray-400 text-xs mt-1">
                        Vocab: {item.report.vocabulary_level} • Corrections: {item.report.grammar_mistakes?.length || 0}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-semibold gradient-text">View Full Report</span>
                      <svg className="w-4 h-4 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <div className="premium-card rounded-2xl sm:rounded-3xl p-6 sm:p-10 mb-6 sm:mb-8 noise-overlay">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <span className="badge-coming-soon mb-3 inline-block">
                    {session.course}
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800">
                    Welcome, {session.name}! 👋
                  </h2>
                  <p className="text-gray-400 mt-2 text-xs sm:text-sm">
                    Your Fluventra pass is active. Let&apos;s speak to the world.
                  </p>
                </div>
                <div className="text-center px-5 sm:px-6 py-3 sm:py-4 rounded-2xl bg-purple-50 border border-purple/10 w-full md:w-auto flex-shrink-0">
                  <div className="text-3xl sm:text-4xl font-extrabold gradient-text">
                    {session.hours}
                  </div>
                  <div className="text-[0.65rem] sm:text-xs text-gray-400 uppercase tracking-wider mt-1 font-semibold">
                    Hours Remaining
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* AI Coach Card */}
              <div className="premium-card card-hover rounded-2xl p-5 sm:p-7 flex flex-col">
                <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">🤖</div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">
                  Practice Voice Mode
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed flex-1">
                  Connect with our 24/7 AI Speaking Partner for natural conversation
                  practice without judgment. Each session is 7 minutes.
                </p>
                <button
                  onClick={() => router.push("/session")}
                  className="gradient-btn mt-5 sm:mt-6 w-full py-3 sm:py-3.5 cursor-pointer text-sm"
                >
                  <span>Launch AI Coach</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>

              {/* Reports Card */}
              <div className="premium-card card-hover rounded-2xl p-5 sm:p-7 flex flex-col">
                <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">📊</div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">
                  Performance History
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed flex-1">
                  Review your fluency scores, grammar reports, and improved phrasing
                  from your past sessions.
                </p>
                <button
                  onClick={handleLoadHistory}
                  className="inline-flex items-center justify-center gap-2.5 font-semibold rounded-full px-8 py-3 sm:py-3.5 text-sm bg-white border-2 border-gray-200 text-gray-700 hover:border-purple/40 hover:text-purple mt-5 sm:mt-6 w-full cursor-pointer transition-all duration-300"
                >
                  View History
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
