"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getStudentSession, clearStudentSession, type StudentSession } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudentSession | null>(null);

  useEffect(() => {
    const s = getStudentSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSession(s);
  }, [router]);

  const handleLogout = () => {
    clearStudentSession();
    router.push("/");
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
              className="inline-flex items-center justify-center gap-2.5 font-semibold rounded-full px-8 py-3 sm:py-3.5 text-sm bg-white border-2 border-gray-200 text-gray-400 mt-5 sm:mt-6 w-full cursor-not-allowed opacity-60"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
