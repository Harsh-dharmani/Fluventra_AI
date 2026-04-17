"""
Test script for SpeakEasy backend services.

Run with:  python test_services.py

Make sure your .env file is configured with valid credentials before running.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()


def divider(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


# ── 1. Test STT ─────────────────────────────────────────────────────────────

def test_stt():
    divider("TEST: Speech-to-Text (transcribe_audio)")
    from services.stt import transcribe_audio

    # A dummy bytes object — will produce an empty transcript since it's
    # not real audio, but verifies the client initialises correctly.
    dummy_audio = b"\x00" * 100

    try:
        result = transcribe_audio(dummy_audio)
        print(f"  Result type : {type(result).__name__}")
        print(f"  Transcript  : '{result}'")
        print("  ✅ STT service initialised successfully")
    except Exception as e:
        print(f"  ❌ STT Error: {e}")


# ── 2. Test LLM (get_reply) ─────────────────────────────────────────────────

def test_get_reply():
    divider("TEST: LLM get_reply")
    from services.llm import get_reply

    sample_message = "Hi! I want to practice my English. I am a student from India."
    sample_history = []
    level = "intermediate"
    mode = "conversation"

    try:
        reply = get_reply(sample_message, sample_history, level, mode)
        print(f"  Student : {sample_message}")
        print(f"  Coach   : {reply}")
        print("  ✅ get_reply works correctly")
    except Exception as e:
        print(f"  ❌ LLM get_reply Error: {e}")


# ── 3. Test TTS ──────────────────────────────────────────────────────────────

def test_tts():
    divider("TEST: Text-to-Speech")
    from services.tts import text_to_speech

    sample_text = "Hello! Welcome to your English practice session. Let's get started!"

    try:
        audio_b64 = text_to_speech(sample_text)
        print(f"  Input text       : {sample_text}")
        print(f"  Base64 length    : {len(audio_b64)} characters")
        print(f"  First 80 chars   : {audio_b64[:80]}...")
        print("  ✅ TTS service works correctly")
    except Exception as e:
        print(f"  ❌ TTS Error: {e}")


# ── 4. Test LLM (analyze_session) ───────────────────────────────────────────

def test_analyze_session():
    divider("TEST: LLM analyze_session")
    from services.llm import analyze_session

    sample_transcript = [
        {"role": "user", "content": "Hi, my name is Rahul and I am wanting to practice English."},
        {"role": "assistant", "content": "Hi Rahul! That's great. What do you like to do in your free time?"},
        {"role": "user", "content": "I am liking to play cricket and watching movies. Yesterday I goed to the cinema."},
        {"role": "assistant", "content": "That sounds fun! What movie did you watch?"},
        {"role": "user", "content": "I watched a action movie. It was very excited and I enjoyed very much."},
        {"role": "assistant", "content": "Action movies are exciting! Who is your favorite actor?"},
        {"role": "user", "content": "My favorite actor is Shah Rukh Khan. He have many good films."},
    ]

    try:
        report = analyze_session(sample_transcript, level="intermediate", mode="conversation")
        print("  Analysis Report:")
        print(f"    Fluency Score     : {report.get('fluency_score')}")
        print(f"    Vocabulary Level  : {report.get('vocabulary_level')}")
        print(f"    Grammar Mistakes  : {len(report.get('grammar_mistakes', []))} found")
        for i, mistake in enumerate(report.get("grammar_mistakes", [])[:3], 1):
            print(f"      {i}. \"{mistake.get('wrong')}\" → \"{mistake.get('correct')}\"")
            print(f"         {mistake.get('explanation')}")
        print(f"    Strengths         : {report.get('strengths')}")
        print(f"    Suggestions       : {report.get('suggestions')}")
        print(f"    Improved Sentences: {len(report.get('improved_sentences', []))} provided")
        print("  ✅ analyze_session works correctly")
    except Exception as e:
        print(f"  ❌ analyze_session Error: {e}")


# ── Run all tests ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🚀 SpeakEasy Backend — Service Tests\n")

    tests = [
        ("STT", test_stt),
        ("LLM Reply", test_get_reply),
        ("TTS", test_tts),
        ("LLM Analysis", test_analyze_session),
    ]

    # Allow running specific tests via CLI args
    # e.g.: python test_services.py stt tts
    if len(sys.argv) > 1:
        selected = [arg.lower() for arg in sys.argv[1:]]
        tests = [(name, fn) for name, fn in tests if name.lower().split()[0] in selected]

    for name, fn in tests:
        fn()

    divider("ALL TESTS COMPLETE")
