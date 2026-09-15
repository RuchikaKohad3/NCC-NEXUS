import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

WHISPER_MODEL = os.getenv(
    "WHISPER_MODEL",
    "small"
)

WAV2VEC_MODEL = os.getenv(
    "WAV2VEC_MODEL",
    "facebook/wav2vec2-base-960h"
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash"
)

VOICE_AI_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "VOICE_AI_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
