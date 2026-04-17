"""SpeakEasy — Voice-Based English Fluency Coach API."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models import AnalyzeRequest, ChatRequest, AdminGenerateRequest, AccessValidateRequest, AdminStatusRequest
from services.llm import analyze_session, get_reply
from services.stt import transcribe_audio
from services.tts import text_to_speech
from services import access

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

# Mount static files
app.mount("/public", StaticFiles(directory="public"), name="public")


# ── Helpers ─────────────────────────────────────────────────────────────────


def _validate_api_key(x_api_key: str | None) -> None:
    """Raise 401 if the provided key doesn't match APP_SECRET."""
    expected = os.getenv("APP_SECRET", "")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

def _validate_admin(x_admin_id: str | None, x_admin_password: str | None) -> None:
    """Raise 401 if admin credentials do not match environment variables."""
    expected_id = os.getenv("ADMIN_ID", "")
    expected_pw = os.getenv("ADMIN_PASSWORD", "")
    
    if not expected_id or not expected_pw:
        raise HTTPException(status_code=500, detail="Super Admin not configured on server")
        
    if x_admin_id != expected_id or x_admin_password != expected_pw:
        raise HTTPException(status_code=401, detail="Invalid Super Admin credentials")


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
        segments = transcribe_audio(audio_bytes)
        text = " ".join(seg["transcript"] for seg in segments)
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
            time_remaining_seconds=body.time_remaining_seconds,
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


@app.post("/api/admin/generate")
async def admin_generate(
    body: AdminGenerateRequest,
    x_admin_id: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
):
    """Generate a new access code."""
    _validate_admin(x_admin_id, x_admin_password)
    try:
        code = access.create_access_code(
            student_name=body.studentName,
            course=body.course,
            duration_days=body.durationDays
        )
        return {"success": True, "code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/codes")
async def admin_get_codes(
    x_admin_id: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
):
    """Get all generated access codes for the dashboard."""
    _validate_admin(x_admin_id, x_admin_password)
    try:
        codes = access.get_codes()
        return {"success": True, "data": codes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/admin/codes/{code}/status")
async def admin_update_code_status(
    code: str,
    body: AdminStatusRequest,
    x_admin_id: str | None = Header(default=None),
    x_admin_password: str | None = Header(default=None),
):
    """Pause or activate an access code."""
    _validate_admin(x_admin_id, x_admin_password)
    try:
        success = access.update_code_status(code, body.isActive)
        if not success:
            raise HTTPException(status_code=404, detail="Code not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/access/validate")
async def access_validate(body: AccessValidateRequest):
    """Validate an access code."""
    try:
        session_data = access.validate_access_code(body.code)
        if not session_data:
            raise HTTPException(status_code=401, detail="Invalid or expired code")
        return {
            "success": True,
            **session_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

