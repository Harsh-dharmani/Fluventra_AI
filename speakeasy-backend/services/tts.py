"""Text-to-Speech service using Google Cloud Text-to-Speech."""

import base64

from google.cloud import texttospeech


def text_to_speech(text: str) -> str:
    """
    Convert text to speech and return base64-encoded MP3 audio.

    Args:
        text: The text to synthesize into speech.

    Returns:
        Base64-encoded MP3 audio string that the frontend can play directly.
    """
    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Journey-F",
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )

    audio_base64 = base64.b64encode(response.audio_content).decode("utf-8")

    return audio_base64
