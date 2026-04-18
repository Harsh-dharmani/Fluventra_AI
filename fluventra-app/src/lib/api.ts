import { APP_CONFIG } from "@/lib/config";

const API_BASE = APP_CONFIG.apiBaseUrl;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    let code: string | undefined;

    try {
      const payload = await res.json();
      const detail = payload?.detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail === "object") {
        if (typeof detail.message === "string") {
          message = detail.message;
        }
        if (typeof detail.code === "string") {
          code = detail.code;
        }
      } else if (typeof payload?.message === "string") {
        message = payload.message;
      }
    } catch {
      const text = await res.text();
      if (text) {
        message = text;
      }
    }

    throw new ApiError(message, res.status, code);
  }
  return res.json();
}

function withBearerToken(token: string, baseHeaders: HeadersInit = {}) {
  return {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
  };
}

// ── Student Endpoints ──────────────────────────────────────
export function validateCode(code: string) {
  return request("/api/access/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function transcribeAudio(blob: Blob, studentToken: string) {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  return request("/transcribe", {
    method: "POST",
    headers: withBearerToken(studentToken),
    body: formData,
  });
}

export function chatWithAI(payload: {
  message: string;
  history: { role: string; parts: string[] }[];
  level: string;
  mode: string;
  time_remaining_seconds: number;
  studentToken: string;
}) {
  return request("/chat", {
    method: "POST",
    headers: withBearerToken(payload.studentToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      message: payload.message,
      history: payload.history,
      level: payload.level,
      mode: payload.mode,
      time_remaining_seconds: payload.time_remaining_seconds,
    }),
  });
}

export function analyzeSession(payload: {
  transcript: { role: string; content: string }[];
  level: string;
  mode: string;
  accessCode?: string;
  studentToken: string;
}) {
  return request("/analyze", {
    method: "POST",
    headers: withBearerToken(payload.studentToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      accessCode: payload.accessCode || "",
      transcript: payload.transcript,
      level: payload.level,
      mode: payload.mode,
    }),
  });
}

export function getStudentHistory(accessCode: string, studentToken: string) {
  return request(`/api/history/${accessCode}`, {
    method: "GET",
    headers: withBearerToken(studentToken),
  });
}

// ── Admin Endpoints ────────────────────────────────────────
export function adminLogin(payload: { adminId: string; adminPassword: string }) {
  return request("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function adminGetCodes(adminToken: string) {
  return request("/api/admin/codes", {
    method: "GET",
    headers: withBearerToken(adminToken),
  });
}

export function adminGenerateCode(
  adminToken: string,
  payload: { studentName: string; course: string; durationDays: number }
) {
  return request("/api/admin/generate", {
    method: "POST",
    headers: withBearerToken(adminToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
}

export function adminToggleCodeStatus(
  adminToken: string,
  code: string,
  isActive: boolean
) {
  return request(`/api/admin/codes/${code}/status`, {
    method: "PATCH",
    headers: withBearerToken(adminToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ isActive }),
  });
}
