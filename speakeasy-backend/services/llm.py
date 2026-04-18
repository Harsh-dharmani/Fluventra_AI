"""LLM service using Google Gemini 1.5 Flash."""

import json

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig, Content, Part

from services.config import (
    GEMINI_MODEL,
    GEMINI_CHAT_TEMPERATURE,
    GEMINI_CHAT_MAX_OUTPUT_TOKENS,
    GEMINI_ANALYSIS_TEMPERATURE,
    GEMINI_ANALYSIS_MAX_OUTPUT_TOKENS,
    SESSION_DEFAULT_SECONDS,
)


from services.prompts import (
    CONVERSATION_SYSTEM_PROMPT,
    INTERVIEW_SYSTEM_PROMPT,
    ANALYSIS_SYSTEM_PROMPT,
)


def get_reply(
    message: str,
    history: list,
    level: str,
    mode: str,
    time_remaining_seconds: int = SESSION_DEFAULT_SECONDS,
) -> str:
    """
    Get a conversational reply from the AI coach.

    Args:
        message: The student's latest message.
        history: Conversation history in Gemini format
                 [{"role": "user"/"model", "parts": ["..."]}].
        level: Student's English level (beginner/intermediate/advanced).
        mode: Session mode ('conversation' or 'interview').
        time_remaining_seconds: Time left in the session.

    Returns:
        The AI coach's reply as a plain string.
    """
    vertexai.init()

    mins = max(0, time_remaining_seconds // 60)
    secs = max(0, time_remaining_seconds % 60)
    
    if time_remaining_seconds <= 0:
        time_status = "CRITICAL INSTRUCTION: Time is up! 0 seconds remaining. Immediately say goodbye and gracefully end the session. DO NOT ask any further questions."
    elif time_remaining_seconds <= 60:
        time_status = f"INSTRUCTION: Only {mins}m {secs}s remaining in this session. Start wrapping up the conversation. DO NOT mention the time remaining out loud in your text."
    else:
        time_status = f"SYSTEM NOTE: There are {mins}m {secs}s left. Pace the conversation normally. DO NOT say the time remaining out loud in your response."

    system_prompt = (
        INTERVIEW_SYSTEM_PROMPT if mode == "interview" else CONVERSATION_SYSTEM_PROMPT
    ).format(level=level, time_status=time_status)

    model = GenerativeModel(
        GEMINI_MODEL,
        system_instruction=system_prompt,
    )

    vertex_history = []
    for msg in history:
        # vertexai expects Content objects with Part objects for history
        parts = [Part.from_text(text) for text in msg.get("parts", [])]
        vertex_history.append(Content(role=msg["role"], parts=parts))

    chat = model.start_chat(history=vertex_history)

    response = chat.send_message(
        message,
        generation_config=GenerationConfig(
            temperature=GEMINI_CHAT_TEMPERATURE,
            max_output_tokens=GEMINI_CHAT_MAX_OUTPUT_TOKENS,
        ),
    )

    return response.text.strip()


def analyze_session(transcript: list, level: str, mode: str) -> dict:
    """
    Analyze a full session transcript and return a structured report.

    Args:
        transcript: List of dicts [{"role": "user"/"assistant", "content": "..."}].
        level: Student's English level.
        mode: Session mode that was used.

    Returns:
        Dict with fluency_score, grammar_mistakes, vocabulary_level,
        strengths, suggestions, and improved_sentences.
    """
    vertexai.init()

    system_prompt = ANALYSIS_SYSTEM_PROMPT.format(level=level, mode=mode)

    # Build a readable transcript string
    transcript_text = "\n".join(
        f"{'Student' if msg['role'] == 'user' else 'Coach'}: {msg['content']}"
        for msg in transcript
    )

    model_with_system = GenerativeModel(
        GEMINI_MODEL,
        system_instruction=system_prompt,
    )

    response = model_with_system.generate_content(
        f"Here is the full conversation transcript:\n\n{transcript_text}",
        generation_config=GenerationConfig(
            temperature=GEMINI_ANALYSIS_TEMPERATURE,
            max_output_tokens=GEMINI_ANALYSIS_MAX_OUTPUT_TOKENS,
        ),
    )

    raw_text = response.text.strip()

    # Strip markdown code fences if the model wraps its output
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]  # remove opening fence line
    if raw_text.endswith("```"):
        raw_text = raw_text.rsplit("```", 1)[0]
    raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {
            "fluency_score": 0,
            "grammar_mistakes": [],
            "vocabulary_level": "unknown",
            "strengths": [],
            "suggestions": ["Analysis could not be parsed. Please try again."],
            "improved_sentences": [],
            "raw_response": raw_text,
        }
