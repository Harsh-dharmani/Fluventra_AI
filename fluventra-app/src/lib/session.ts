export interface StudentSession {
  code: string;
  name: string;
  course: string;
  hours: number;
}

export interface AdminSession {
  adminId: string;
  adminPassword: string;
}

const STUDENT_KEY = "fluventra_student_session";
const ADMIN_KEY = "fluventra_admin_session";

// ── Student ──────────────────────────────────────
export function getStudentSession(): StudentSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STUDENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStudentSession(data: StudentSession): void {
  sessionStorage.setItem(STUDENT_KEY, JSON.stringify(data));
}

export function clearStudentSession(): void {
  sessionStorage.removeItem(STUDENT_KEY);
}

// ── Admin ────────────────────────────────────────
export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminSession(data: AdminSession): void {
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(data));
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_KEY);
}
