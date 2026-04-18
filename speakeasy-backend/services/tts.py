import os
import base64
import httpx

from services.config import (
    DEEPGRAM_TTS_BASE_URL,
    DEEPGRAM_TTS_VOICE_MODEL,
    DEEPGRAM_TTS_ENCODING,
    DEEPGRAM_TTS_TIMEOUT_SECONDS,
)
from services.deepgram_errors import DeepgramCreditsExpiredError, is_deepgram_credit_error

def text_to_speech(text: str) -> str:
    """
    Generates text-to-speech using Deepgram Aura and returns a base64 encoded mp3 string.
    """
    print("Generating speech with Deepgram Aura...")
    
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPGRAM_API_KEY not found. Check your .env file.")

    url = f"{DEEPGRAM_TTS_BASE_URL}?model={DEEPGRAM_TTS_VOICE_MODEL}&encoding={DEEPGRAM_TTS_ENCODING}"
    
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"text": text}

    # Using httpx for a robust, synchronous HTTP request
    with httpx.Client() as client:
        response = client.post(
            url,
            headers=headers,
            json=payload,
            timeout=DEEPGRAM_TTS_TIMEOUT_SECONDS,
        )
    
    if response.status_code != 200:
        if is_deepgram_credit_error(response.text, response.status_code):
            raise DeepgramCreditsExpiredError("Deepgram credits expired")
        raise RuntimeError(f"Deepgram TTS failed: {response.status_code} - {response.text}")

    # Deepgram returns raw audio bytes
    audio_bytes = response.content
    
    # Convert to base64 so it can be sent inside a JSON payload to the frontend
    encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")
    
    print("  -> Speech generated successfully.")
    return encoded_audio
