"use client";

import { useEffect, useState, useRef } from "react";

interface TimerProps {
  maxSeconds?: number;
  onTimeUp: () => void;
  isRunning: boolean;
  onTick?: (remaining: number) => void;
}

export default function Timer({
  maxSeconds = 420,
  onTimeUp,
  isRunning,
  onTick,
}: TimerProps) {
  const [remaining, setRemaining] = useState(maxSeconds);
  
  const savedOnTick = useRef(onTick);
  const savedOnTimeUp = useRef(onTimeUp);

  useEffect(() => {
    savedOnTick.current = onTick;
    savedOnTimeUp.current = onTimeUp;
  }, [onTick, onTimeUp]);

  useEffect(() => {
    if (isRunning) {
      setRemaining(maxSeconds);
    }
  }, [isRunning, maxSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (savedOnTick.current) savedOnTick.current(next);
        if (next <= 0) {
          clearInterval(interval);
          if (savedOnTimeUp.current) savedOnTimeUp.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const mins = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");

  const isCritical = remaining <= 60 && remaining > 0;
  const isZero = remaining <= 0;

  if (!isRunning && remaining === maxSeconds) return null;

  return (
    <div
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-mono text-lg font-bold tracking-wider ${
        isZero
          ? "bg-red-500/15 text-red-500 border border-red-500/30"
          : isCritical
            ? "bg-red-500/10 text-red-500 border border-red-500/20 timer-critical"
            : "bg-purple-50 text-purple border border-purple/20"
      }`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {mins}:{secs}
    </div>
  );
}
