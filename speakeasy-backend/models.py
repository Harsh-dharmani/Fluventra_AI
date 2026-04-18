"""Pydantic models for request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional

from services.config import SESSION_DEFAULT_SECONDS


class HistoryMessage(BaseModel):
    """A single message in conversation history (Gemini format)."""
    role: str = Field(..., description="Either 'user' or 'model'")
    parts: List[str] = Field(..., description="List of message parts")


class ChatRequest(BaseModel):
    """Request body for the /chat endpoint."""
    message: str = Field(..., description="The user's current message")
    history: List[HistoryMessage] = Field(
        default_factory=list,
        description="Conversation history in Gemini format",
    )
    level: str = Field(
        default="intermediate",
        description="Student's English level: beginner, intermediate, advanced",
    )
    mode: str = Field(
        default="conversation",
        description="Chat mode: 'conversation' or 'interview'",
    )
    time_remaining_seconds: int = Field(
        default=SESSION_DEFAULT_SECONDS,
        description="Remaining time in seconds for the session (default 7 minutes).",
    )


class TranscriptMessage(BaseModel):
    """A single message in a session transcript."""
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class AnalyzeRequest(BaseModel):
    """Request body for the /analyze endpoint."""
    accessCode: str = Field(
        ..., description="The student's unique access code"
    )
    transcript: List[TranscriptMessage] = Field(
        ..., description="Full conversation transcript"
    )
    level: str = Field(
        default="intermediate",
        description="Student's English level: beginner, intermediate, advanced",
    )
    mode: str = Field(
        default="conversation",
        description="Session mode: 'conversation' or 'interview'",
    )


class AdminGenerateRequest(BaseModel):
    """Request body for /api/admin/generate."""
    studentName: str
    course: str
    durationDays: int


class AccessValidateRequest(BaseModel):
    """Request body for /api/access/validate."""
    code: str

class AdminStatusRequest(BaseModel):
    """Request body for /api/admin/codes/{code}/status."""
    isActive: bool
