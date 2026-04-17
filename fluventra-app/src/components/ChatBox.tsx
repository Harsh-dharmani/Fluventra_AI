"use client";

import { useEffect, useRef } from "react";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface ChatBoxProps {
  messages: Message[];
}

export default function ChatBox({ messages }: ChatBoxProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-2xl premium-card p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <p className="text-gray-400 text-sm">
            Start the session to begin your conversation with the AI Coach.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto rounded-2xl p-5 bg-white/25 backdrop-blur-lg border border-white/60 min-h-[300px] max-h-[450px]">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={
            msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {msg.text}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
