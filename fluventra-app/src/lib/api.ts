const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function analyzeSession(payload: {
  transcript: { role: string; content: string }[];
  level: string;
  mode: string;
}) {
  return request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
