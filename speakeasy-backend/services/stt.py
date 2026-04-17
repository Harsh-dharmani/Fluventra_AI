"""Speech-to-Text service using Google Cloud Speech-to-Text."""

from google.cloud import speech


def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribe audio bytes to text using Google Cloud Speech-to-Text.

    Args:
        audio_bytes: Raw audio bytes in WEBM_OPUS format at 48000hz.

    Returns:
        Transcribed text string. Returns empty string if no speech detected.
    """
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(content=audio_bytes)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sample_rate_hertz=48000,
        language_code="en-US",
        enable_automatic_punctuation=True,
    )

    response = client.recognize(config=config, audio=audio)

    if not response.results:
        return ""

    transcript = " ".join(
        result.alternatives[0].transcript
        for result in response.results
        if result.alternatives
    )

    return transcript.strip()
