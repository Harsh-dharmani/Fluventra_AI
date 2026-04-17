"""LLM service using Google Gemini 1.5 Flash."""

import json
import os

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig, Content, Part



# ── System prompts ──────────────────────────────────────────────────────────

CONVERSATION_SYSTEM_PROMPT = """You are a friendly and encouraging English fluency coach.
Your role is to have a natural conversation with the student to help them practice speaking English.

Rules:
- Keep your replies to 2-3 sentences maximum.
- Do NOT correct grammar mistakes mid-conversation — just keep the conversation flowing.
- Be warm, encouraging, and supportive.
- Respond naturally to what the student says and ask follow-up questions to keep them talking.
- Adapt your vocabulary and sentence complexity to the student's level: {level}.
"""

INTERVIEW_SYSTEM_PROMPT = """You are a friendly English fluency coach conducting a mock interview.
Your role is to help the student practice answering interview questions in English.

Rules:
- Keep your replies to 2-3 sentences maximum.
- Ask one clear interview question at a time, then wait for the student's answer.
- After they answer, give a brief encouraging acknowledgment and move to the next question.
- Do NOT correct grammar mistakes mid-interview — save that for the analysis.
- Adapt the difficulty of your questions to the student's level: {level}.
- Cover a variety of common interview topics (self-introduction, strengths, experiences, goals).
"""

ANALYSIS_SYSTEM_PROMPT = """You are an expert English language assessor. Analyze the following conversation transcript between a student and an AI English coach.

The student's declared level is: {level}
The session mode was: {mode}

Provide a detailed analysis in **valid JSON** format with exactly this structure:
{{
  "fluency_score": <integer from 1 to 10>,
  "grammar_mistakes": [
    {{"wrong": "what student said", "correct": "corrected version", "explanation": "brief explanation"}}
  ],
  "vocabulary_level": "beginner" | "intermediate" | "advanced",
  "strengths": ["strength 1", "strength 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "improved_sentences": [
    {{"original": "student's sentence", "improved": "improved version"}}
  ]
}}

Be specific and constructive. If the student made no mistakes, still provide encouragement and suggestions for further growth.
Return ONLY the JSON object — no markdown fences, no extra text.
"""


def get_reply(message: str, history: list, level: str, mode: str) -> str:
    """
    Get a conversational reply from the AI coach.

    Args:
        message: The student's latest message.
        history: Conversation history in Gemini format
                 [{"role": "user"/"model", "parts": ["..."]}].
        level: Student's English level (beginner/intermediate/advanced).
        mode: Session mode ('conversation' or 'interview').

    Returns:
        The AI coach's reply as a plain string.
    """
    vertexai.init()

    system_prompt = (
        INTERVIEW_SYSTEM_PROMPT if mode == "interview" else CONVERSATION_SYSTEM_PROMPT
    ).format(level=level)

    model = GenerativeModel(
        "gemini-2.5-flash-lite",
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
            temperature=0.7,
            max_output_tokens=256,
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
        "gemini-2.5-flash-lite",
        system_instruction=system_prompt,
    )

    response = model_with_system.generate_content(
        f"Here is the full conversation transcript:\n\n{transcript_text}",
        generation_config=GenerationConfig(
            temperature=0.3,
            max_output_tokens=2048,
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
