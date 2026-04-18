import { APP_CONFIG } from "@/lib/config";

const API_BASE = APP_CONFIG.apiBaseUrl;
const API_KEY = APP_CONFIG.apiKey;

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

// ── Student Endpoints ──────────────────────────────────────
export function validateCode(code: string) {
  return request("/api/access/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function transcribeAudio(blob: Blob) {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  return request("/transcribe", { method: "POST", body: formData });
}

export function chatWithAI(payload: {
  message: string;
  history: { role: string; parts: string[] }[];
  level: string;
  mode: string;
  time_remaining_seconds: number;
}) {
  return request("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(payload),
  });
}

export function analyzeSession(payload: {
  accessCode: string;
  transcript: { role: string; content: string }[];
  level: string;
  mode: string;
}) {
  return request("/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(payload),
  });
}

export function getStudentHistory(accessCode: string) {
  return request(`/api/history/${accessCode}`, {
    method: "GET",
    headers: {
      "X-Api-Key": API_KEY,
    },
  });
}

// ── Admin Endpoints ────────────────────────────────────────
export function adminGetCodes(adminId: string, adminPassword: string) {
  return request("/api/admin/codes", {
    method: "GET",
    headers: {
      "X-Admin-Id": adminId,
      "X-Admin-Password": adminPassword,
    },
  });
}

export function adminGenerateCode(
  adminId: string,
  adminPassword: string,
  payload: { studentName: string; course: string; durationDays: number }
) {
  return request("/api/admin/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Id": adminId,
      "X-Admin-Password": adminPassword,
    },
    body: JSON.stringify(payload),
  });
}

export function adminToggleCodeStatus(
  adminId: string,
  adminPassword: string,
  code: string,
  isActive: boolean
) {
  return request(`/api/admin/codes/${code}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Id": adminId,
      "X-Admin-Password": adminPassword,
    },
    body: JSON.stringify({ isActive }),
  });
}
