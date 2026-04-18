"""SpeakEasy — Voice-Based English Fluency Coach API."""
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

# Load .env before any service imports
load_dotenv()

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models import (
    AnalyzeRequest,
    ChatRequest,
    AdminGenerateRequest,
    AccessValidateRequest,
    AdminStatusRequest,
    AdminLoginRequest,
)
from services.llm import analyze_session, get_reply
from services.stt import transcribe_audio
from services.tts import text_to_speech
from services.deepgram_errors import (
    DeepgramCreditsExpiredError,
    SERVER_DOWN_MESSAGE,
)
from services.config import (
    APP_SECRET,
    ADMIN_ID,
    ADMIN_PASSWORD,
    CORS_ALLOWED_ORIGINS,
    ADMIN_TOKEN_TTL_SECONDS,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
    INTERNAL_SERVER_ERROR_MESSAGE,
)
from services.auth import create_token, verify_token
from services.rate_limit import SlidingWindowRateLimiter
from services import access
from services.history import save_session_report, get_student_history


logger = logging.getLogger(__name__)
rate_limiter = SlidingWindowRateLimiter(
    max_requests=RATE_LIMIT_MAX_REQUESTS,
    window_seconds=RATE_LIMIT_WINDOW_SECONDS,
)

# ── Lifespan ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    if not APP_SECRET:
        raise RuntimeError("APP_SECRET must be configured")
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
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

# Mount static files
app.mount("/public", StaticFiles(directory="public"), name="public")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "microphone=(self)"
    return response


@app.middleware("http")
async def enforce_rate_limit(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{request.url.path}"
    if not rate_limiter.allow(key):
        return JSONResponse(status_code=429, content={"detail": "Too many requests"})

    return await call_next(request)


# ── Helpers ─────────────────────────────────────────────────────────────────


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return authorization[len(prefix):].strip()

def _validate_admin(x_admin_id: str | None, x_admin_password: str | None) -> None:
    """Raise 401 if admin credentials do not match environment variables."""
    expected_id = ADMIN_ID
    expected_pw = ADMIN_PASSWORD
    
    if not expected_id or not expected_pw:
        raise HTTPException(status_code=500, detail="Super Admin not configured on server")
        
    if x_admin_id != expected_id or x_admin_password != expected_pw:
        raise HTTPException(status_code=401, detail="Invalid Super Admin credentials")


def _validate_admin_token(authorization: str | None) -> dict:
    token = _extract_bearer_token(authorization)
    payload = verify_token(token, expected_subject="admin")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")
    return payload


def _validate_student_token(authorization: str | None) -> dict:
    token = _extract_bearer_token(authorization)
    payload = verify_token(token, expected_subject="student")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired student token")
    return payload


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
async def transcribe(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    """
    Accept an audio file upload and return the transcription.

    Returns:
        {"text": "transcribed text..."}
    """
    _validate_student_token(authorization)

    try:
        audio_bytes = await file.read()
        segments = transcribe_audio(audio_bytes)
        text = " ".join(seg["transcript"] for seg in segments)
        return {"text": text}
    except DeepgramCreditsExpiredError:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DEEPGRAM_CREDITS_EXPIRED",
                "message": SERVER_DOWN_MESSAGE,
            },
        )
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)


@app.post("/chat")
async def chat(
    body: ChatRequest,
    authorization: str | None = Header(default=None),
):
    """
    Send a message to the AI coach and get a reply with audio.

    Returns:
        {"reply": "text reply", "audio_base64": "base64 mp3"}
    """
    _validate_student_token(authorization)

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
    except DeepgramCreditsExpiredError:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DEEPGRAM_CREDITS_EXPIRED",
                "message": SERVER_DOWN_MESSAGE,
            },
        )
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)


@app.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    authorization: str | None = Header(default=None),
):
    """
    Analyze a full session transcript and return a detailed report.

    Returns:
        Full analysis dict with fluency_score, grammar_mistakes, etc.
    """
    student_payload = _validate_student_token(authorization)

    try:
        transcript = [msg.model_dump() for msg in body.transcript]

        report = analyze_session(
            transcript=transcript,
            level=body.level,
            mode=body.mode,
        )

        save_session_report(
            access_code=student_payload.get("code", body.accessCode),
            level=body.level,
            mode=body.mode,
            report=report
        )

        return report
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)

@app.get("/api/history/{accessCode}")
async def get_history(
    accessCode: str,
    authorization: str | None = Header(default=None),
):
    """
    Get all past session reports for a specific student.
    """
    student_payload = _validate_student_token(authorization)
    if student_payload.get("code") != accessCode:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        history = get_student_history(accessCode)
        # Reverse to show newest first
        history.reverse()
        return {"success": True, "data": history}
    except Exception as e:
        logger.exception("Failed to fetch history")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)


@app.post("/api/admin/login")
async def admin_login(body: AdminLoginRequest):
    """Authenticate admin and issue a signed token."""
    _validate_admin(body.adminId, body.adminPassword)
    token = create_token(
        subject="admin",
        payload={"admin_id": body.adminId},
        ttl_seconds=ADMIN_TOKEN_TTL_SECONDS,
    )
    return {"success": True, "token": token}

@app.post("/api/admin/generate")
async def admin_generate(
    body: AdminGenerateRequest,
    authorization: str | None = Header(default=None),
):
    """Generate a new access code."""
    _validate_admin_token(authorization)
    try:
        code = access.create_access_code(
            student_name=body.studentName,
            course=body.course,
            duration_days=body.durationDays
        )
        return {"success": True, "code": code}
    except Exception as e:
        logger.exception("Admin generate failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)

@app.get("/api/admin/codes")
async def admin_get_codes(
    authorization: str | None = Header(default=None),
):
    """Get all generated access codes for the dashboard."""
    _validate_admin_token(authorization)
    try:
        codes = access.get_codes()
        return {"success": True, "data": codes}
    except Exception as e:
        logger.exception("Admin get codes failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)

@app.patch("/api/admin/codes/{code}/status")
async def admin_update_code_status(
    code: str,
    body: AdminStatusRequest,
    authorization: str | None = Header(default=None),
):
    """Pause or activate an access code."""
    _validate_admin_token(authorization)
    try:
        success = access.update_code_status(code, body.isActive)
        if not success:
            raise HTTPException(status_code=404, detail="Code not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Admin update code status failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)


@app.post("/api/access/validate")
async def access_validate(body: AccessValidateRequest):
    """Validate an access code."""
    try:
        sanitized_code = body.code.strip().upper()
        session_data = access.validate_access_code(sanitized_code)
        if not session_data:
            raise HTTPException(status_code=401, detail="Invalid or expired code")
        token = create_token(
            subject="student",
            payload={"code": sanitized_code},
        )
        return {
            "success": True,
            "token": token,
            **session_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Access code validation failed")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MESSAGE)

