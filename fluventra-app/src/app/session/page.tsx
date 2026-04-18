"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getStudentSession, clearStudentSession } from "@/lib/session";
import { ApiError, chatWithAI, transcribeAudio, analyzeSession } from "@/lib/api";
import { APP_CONFIG } from "@/lib/config";
import Timer from "@/components/Timer";
import ChatBox from "@/components/ChatBox";
import AnalysisReport from "@/components/AnalysisReport";

interface Message {
  role: "user" | "ai";
  text: string;
}

type AnalysisData = {
  fluency_score: number;
  grammar_mistakes: { wrong: string; correct: string; explanation: string }[];
  vocabulary_level: string;
  strengths: string[];
  suggestions: string[];
  improved_sentences: { original: string; improved: string }[];
};

const SERVER_DOWN_MESSAGE = APP_CONFIG.serverDownMessage;

function isServerDownError(err: unknown): boolean {
  return err instanceof ApiError && (err.code === "DEEPGRAM_CREDITS_EXPIRED" || err.status === 503);
}

function getErrorMessage(err: unknown): string {
  if (isServerDownError(err)) {
    return SERVER_DOWN_MESSAGE;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export default function SessionPage() {
  const router = useRouter();

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState("Ready. Choose your options and begin.");
  const [messages, setMessages] = useState<Message[]>([]);
  const [level, setLevel] = useState("intermediate");
  const [mode, setMode] = useState("conversation");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Audio refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const timeRemainingRef = useRef(APP_CONFIG.sessionDefaultSeconds);

  // Conversation history
  const conversationHistoryRef = useRef<{ role: string; parts: string[] }[]>([]);
  const transcriptHistoryRef = useRef<{ role: string; content: string }[]>([]);
  const isActiveRef = useRef(false);

  useEffect(() => {
    const s = getStudentSession();
    if (!s || !s.code) {
      clearStudentSession();
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const addMessage = useCallback((role: "user" | "ai", text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  // ── VAD ──────────────────────────────────────
  const monitorSilence = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let silenceStart: number | null = null;
    let hasSpoken = false;

    const checkFrame = () => {
      if (!isActiveRef.current) return;
      analyserRef.current!.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (avg > APP_CONFIG.vadSpeechThreshold) { hasSpoken = true; silenceStart = null; }
      else if (hasSpoken && !silenceStart) { silenceStart = Date.now(); }
      if (silenceStart && Date.now() - silenceStart > APP_CONFIG.vadSilenceDurationMs) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        return;
      }
      vadFrameRef.current = requestAnimationFrame(checkFrame);
    };
    vadFrameRef.current = requestAnimationFrame(checkFrame);
  }, []);

  const startRecordingTurn = useCallback(() => {
    if (!isActiveRef.current || !streamRef.current) return;
    setStatus("🎤 Listening...");
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "audio/webm;codecs=opus" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      if (vadFrameRef.current) cancelAnimationFrame(vadFrameRef.current);
      processAudio(new Blob(chunks, { type: "audio/webm" }));
    };
    recorder.start();
    recorderRef.current = recorder;
    monitorSilence();
  }, [monitorSilence]);

  const processAudio = useCallback(async (blob: Blob) => {
    if (!isActiveRef.current) return;
    setStatus("⚙️ Transcribing audio...");
    try {
      const { text } = await transcribeAudio(blob);
      if (!text) {
        setStatus("⚠️ No speech detected. Listening again...");
        if (isActiveRef.current) setTimeout(() => startRecordingTurn(), APP_CONFIG.noSpeechRetryDelayMs);
        return;
      }
      addMessage("user", text);
      const historyToSend = JSON.parse(JSON.stringify(conversationHistoryRef.current));
      conversationHistoryRef.current.push({ role: "user", parts: [text] });
      transcriptHistoryRef.current.push({ role: "user", content: text });

      setStatus("🧠 AI is thinking...");
      const { reply, audio_base64 } = await chatWithAI({
        message: text, history: historyToSend, level, mode,
        time_remaining_seconds: timeRemainingRef.current,
      });

      addMessage("ai", reply);
      conversationHistoryRef.current.push({ role: "model", parts: [reply] });
      transcriptHistoryRef.current.push({ role: "assistant", content: reply });

      const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
      setStatus("🔊 AI is speaking...");
      await audio.play();
      audio.onended = () => {
        if (isActiveRef.current) { setStatus("🔄 Your turn to speak..."); startRecordingTurn(); }
      };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setStatus(errorMessage);
      if (!isServerDownError(err) && isActiveRef.current) {
        setTimeout(() => startRecordingTurn(), APP_CONFIG.genericRetryDelayMs);
      }
    }
  }, [addMessage, level, mode, startRecordingTurn]);

  const triggerAIGreeting = useCallback(async () => {
    if (!isActiveRef.current) return;
    setStatus("🧠 AI is preparing to speak...");
    try {
      const initMessage = APP_CONFIG.aiGreetingMessage;
      const { reply, audio_base64 } = await chatWithAI({
        message: initMessage, history: [], level, mode,
        time_remaining_seconds: timeRemainingRef.current,
      });
      addMessage("ai", reply);
      conversationHistoryRef.current.push({ role: "user", parts: [initMessage] });
      conversationHistoryRef.current.push({ role: "model", parts: [reply] });
      transcriptHistoryRef.current.push({ role: "assistant", content: reply });

      const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
      setStatus("🔊 AI is speaking...");
      await audio.play();
      audio.onended = () => {
        if (isActiveRef.current) { setStatus("🔄 Your turn to speak..."); startRecordingTurn(); }
      };
    } catch (err) {
      setStatus(getErrorMessage(err));
    }
  }, [addMessage, level, mode, startRecordingTurn]);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      setIsActive(true); isActiveRef.current = true;
      setTimerRunning(true); setAnalysis(null); setMessages([]);
      conversationHistoryRef.current = []; transcriptHistoryRef.current = [];
      timeRemainingRef.current = APP_CONFIG.sessionDefaultSeconds;
      triggerAIGreeting();
    } catch { setStatus("⚠️ Microphone access denied."); }
  };

  const handleEnd = useCallback(async () => {
    if (!isActiveRef.current && !isActive) return;
    setIsActive(false); isActiveRef.current = false; setTimerRunning(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (vadFrameRef.current) cancelAnimationFrame(vadFrameRef.current);

    if (transcriptHistoryRef.current.length > 0) {
      setIsAnalyzing(true); setStatus("📊 Generating your analysis report...");
      try {
        const s = getStudentSession();
        const report = await analyzeSession({ accessCode: s?.code || "", transcript: transcriptHistoryRef.current, level, mode });
        setAnalysis(report); setStatus("✅ Session complete! Review your report below.");
      } catch (err) { setStatus(getErrorMessage(err)); }
      finally { setIsAnalyzing(false); }
    } else { setStatus("Session ended. No conversation to analyze."); }
  }, [isActive, level, mode]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="w-full max-w-3xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs sm:text-sm text-gray-400 hover:text-purple transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Fluventra" width={28} height={28} />
            <h1 className="text-base sm:text-lg font-bold gradient-text">AI Coach</h1>
          </div>
          <Timer
            isRunning={timerRunning}
            onTimeUp={handleEnd}
            onTick={(r) => { timeRemainingRef.current = r; }}
          />
        </div>

        {/* Controls */}
        {!isActive && !analysis && (
          <div className="premium-card rounded-2xl p-4 sm:p-6 mb-5 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label htmlFor="level-select" className="form-label">Level</label>
                <select id="level-select" value={level} onChange={(e) => setLevel(e.target.value)} className="form-input">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="mode-select" className="form-label">Mode</label>
                <select id="mode-select" value={mode} onChange={(e) => setMode(e.target.value)} className="form-input">
                  <option value="conversation">Conversation</option>
                  <option value="interview">Mock Interview</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleStart} className="gradient-btn w-full py-2.5 sm:py-3 cursor-pointer animate-pulse-glow text-sm">
                  <span>🎤 Start Session</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Session */}
        {isActive && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <span className="text-xs sm:text-sm text-gray-400">{status}</span>
            <button
              onClick={handleEnd}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all cursor-pointer shadow-md"
            >
              🛑 End Session
            </button>
          </div>
        )}

        {!isActive && !analysis && messages.length === 0 && (
          <div className="text-center text-xs sm:text-sm text-gray-400 mb-4">{status}</div>
        )}

        {isAnalyzing && (
          <div className="text-center text-xs sm:text-sm text-purple mb-4 animate-pulse">{status}</div>
        )}

        <ChatBox messages={messages} />
        <AnalysisReport data={analysis} />

        {analysis && (
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 mb-8 sm:mb-12">
            <button
              onClick={() => { setAnalysis(null); setMessages([]); setStatus("Ready. Choose your options and begin."); }}
              className="gradient-btn py-3 px-6 sm:px-8 cursor-pointer text-sm"
            >
              <span>🔄 New Session</span>
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center justify-center gap-2.5 font-semibold rounded-full px-6 sm:px-8 py-3 text-sm bg-white border-2 border-gray-200 text-gray-700 hover:border-purple/40 hover:text-purple hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              ← Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
