"""SpeakEasy — Voice-Based English Fluency Coach API."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models import AnalyzeRequest, ChatRequest
from services.llm import analyze_session, get_reply
from services.stt import transcribe_audio
from services.tts import text_to_speech

# ── Lifespan ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load .env on startup (only matters for local dev)."""
    load_dotenv()
    yield


# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SpeakEasy API",
    description="Voice-Based English Fluency Coach backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow everything for now (frontend not deployed yet)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ─────────────────────────────────────────────────────────────────


def _validate_api_key(x_api_key: str | None) -> None:
    """Raise 401 if the provided key doesn't match APP_SECRET."""
    expected = os.getenv("APP_SECRET", "")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/")
async def get_ui():
    """Serve the local test UI."""
    return FileResponse("public/index.html")


@app.get("/health")
async def health():
    """Health check for Cloud Run."""
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Accept an audio file upload and return the transcription.

    Returns:
        {"text": "transcribed text..."}
    """
    try:
        audio_bytes = await file.read()
        text = transcribe_audio(audio_bytes)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/chat")
async def chat(
    body: ChatRequest,
    x_api_key: str | None = Header(default=None),
):
    """
    Send a message to the AI coach and get a reply with audio.

    Returns:
        {"reply": "text reply", "audio_base64": "base64 mp3"}
    """
    _validate_api_key(x_api_key)

    try:
        # Convert history to plain dicts for Gemini
        history = [msg.model_dump() for msg in body.history]

        reply_text = get_reply(
            message=body.message,
            history=history,
            level=body.level,
            mode=body.mode,
        )

        audio_base64 = text_to_speech(reply_text)

        return {"reply": reply_text, "audio_base64": audio_base64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    x_api_key: str | None = Header(default=None),
):
    """
    Analyze a full session transcript and return a detailed report.

    Returns:
        Full analysis dict with fluency_score, grammar_mistakes, etc.
    """
    _validate_api_key(x_api_key)

    try:
        transcript = [msg.model_dump() for msg in body.transcript]

        report = analyze_session(
            transcript=transcript,
            level=body.level,
            mode=body.mode,
        )

        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
