function getNumberEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const APP_CONFIG = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "/backend",

  sessionDefaultSeconds: getNumberEnv("NEXT_PUBLIC_SESSION_SECONDS", 420),
  vadSpeechThreshold: getNumberEnv("NEXT_PUBLIC_VAD_SPEECH_THRESHOLD", 15),
  vadSilenceDurationMs: getNumberEnv("NEXT_PUBLIC_VAD_SILENCE_DURATION_MS", 1800),
  noSpeechRetryDelayMs: getNumberEnv("NEXT_PUBLIC_NO_SPEECH_RETRY_DELAY_MS", 500),
  genericRetryDelayMs: getNumberEnv("NEXT_PUBLIC_GENERIC_RETRY_DELAY_MS", 2000),

  serverDownMessage:
    process.env.NEXT_PUBLIC_SERVER_DOWN_MESSAGE ||
    "Server is down. Please contact Fluventra team for further details.",
  aiGreetingMessage:
    process.env.NEXT_PUBLIC_AI_GREETING_MESSAGE ||
    "Hello! I am ready to start my English practice session now.",

  accessCodeLength: getNumberEnv("NEXT_PUBLIC_ACCESS_CODE_LENGTH", 8),
  academyUrl: process.env.NEXT_PUBLIC_ACADEMY_URL || "https://fluventra.com",
};
