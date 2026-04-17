"""Pydantic models for request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional


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


class TranscriptMessage(BaseModel):
    """A single message in a session transcript."""
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class AnalyzeRequest(BaseModel):
    """Request body for the /analyze endpoint."""
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
