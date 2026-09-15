from transformers import (
    Wav2Vec2Processor,
    Wav2Vec2Model
)

from app.config import WAV2VEC_MODEL

print("Loading Wav2Vec2 Model...")

processor = Wav2Vec2Processor.from_pretrained(
    WAV2VEC_MODEL
)

model = Wav2Vec2Model.from_pretrained(
    WAV2VEC_MODEL
)

print("Wav2Vec2 Model Loaded Successfully")