"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { validateCode } from "@/lib/api";
import { setStudentSession } from "@/lib/session";

export default function PortalPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sanitizedCode = code.replace(/[^A-Z0-9]/g, "").slice(0, 8);

  const handleSubmit = async () => {
    if (sanitizedCode.length < 8) {
      setError("Please enter the full 8-digit access code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await validateCode(sanitizedCode);
      setStudentSession({
        code: sanitizedCode,
        name: data.studentName,
        course: data.course,
        hours: data.remainingHours,
      });
      router.push("/dashboard");
    } catch {
      setError("Invalid or expired code. Please contact your academy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="access-page flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
      <section className="access-card noise-overlay relative z-10 w-full max-w-[520px] rounded-[30px] px-7 py-8 sm:px-10 sm:py-9 text-center">
        <div className="mb-4 flex items-center justify-center gap-2.5 sm:gap-3">
          <Image
            src="/logo.png"
            alt="Fluventra"
            width={40}
            height={40}
            className="access-logo h-10 w-10 object-cover"
            priority
          />
          <h1 className="access-title text-[2.2rem] sm:text-[2.85rem] font-extrabold">Fluventra</h1>
        </div>

        <p className="access-subtitle text-[1.12rem] sm:text-[2rem] font-semibold">Speak confidently. Think clearly.</p>
        <p className="access-caption mt-1.5 text-[0.95rem] sm:text-[1.02rem]">Enter your access code to begin.</p>

        <div className="mt-5.5 sm:mt-6">
          <label htmlFor="access-code" className="sr-only">Access Code</label>
          <input
            id="access-code"
            type="text"
            value={sanitizedCode}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={8}
            className="sr-only"
            autoComplete="one-time-code"
            autoFocus
          />

          <button
            type="button"
            onClick={() => document.getElementById("access-code")?.focus()}
            className="access-code-grid"
            aria-label="Enter 8-digit access code"
          >
            {Array.from({ length: 8 }).map((_, idx) => (
              <span key={idx} className={`access-code-slot ${idx === sanitizedCode.length ? "is-active" : ""}`}>
                {sanitizedCode[idx] || "•"}
              </span>
            ))}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || sanitizedCode.length < 8}
          className={`access-continue mt-5 w-full py-3 text-[2rem] sm:text-[2rem] ${loading || sanitizedCode.length < 8 ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span>{loading ? "Checking..." : "Continue"}</span>
          {!loading && <span aria-hidden="true">→</span>}
        </button>

        <p className="access-footer mt-3.5 text-[0.88rem] sm:text-[0.95rem]">
          Don&apos;t have access?{" "}
          <a href="https://fluventra.com" className="font-semibold hover:underline">
            Request an invite
          </a>
        </p>
      </section>

      {/* Decorative desk surface */}
      <div className="access-surface" aria-hidden="true" />
    </main>
  );
}
