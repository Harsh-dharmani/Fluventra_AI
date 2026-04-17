import os
import base64
import httpx

def text_to_speech(text: str) -> str:
    """
    Generates text-to-speech using Deepgram Aura and returns a base64 encoded mp3 string.
    """
    print("Generating speech with Deepgram Aura...")
    
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPGRAM_API_KEY not found. Check your .env file.")

    # You can change the voice model here (e.g., aura-luna-en, aura-orion-en, aura-asteria-en)
    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3"
    
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"text": text}

    # Using httpx for a robust, synchronous HTTP request
    with httpx.Client() as client:
        response = client.post(url, headers=headers, json=payload, timeout=30.0)
    
    if response.status_code != 200:
        raise RuntimeError(f"Deepgram TTS failed: {response.status_code} - {response.text}")

    # Deepgram returns raw audio bytes
    audio_bytes = response.content
    
    # Convert to base64 so it can be sent inside a JSON payload to the frontend
    encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")
    
    print("  -> Speech generated successfully.")
    return encoded_audio
