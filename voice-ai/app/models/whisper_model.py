import whisper

from app.config import WHISPER_MODEL

print("Loading Whisper Model...")

model = whisper.load_model(
    WHISPER_MODEL
)

print("Whisper Model Loaded Successfully")