import numpy as np
import torch

from ..models.wav2vec import (
    processor,
    model,
)

from ..utils.helpers import clamp


def compute_ai_confidence(metrics):
    """
    Compute AI confidence using Wav2Vec2 embeddings.
    """

    y = metrics["audio"]

    amplitude = metrics["amplitude"]

    pitch = metrics["pitch"]

    energy = metrics["energy"]

    duration = metrics["duration"]

    try:

        inputs = processor(
            y,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )

        with torch.no_grad():

            outputs = model(**inputs)

        hidden = outputs.last_hidden_state.squeeze(0)

        embedding_strength = float(
            hidden.abs().mean().item()
        )

        embedding_stability = float(
            hidden.std().item()
        )

        model_signal = np.tanh(
            embedding_strength * 14
        )

        stability = np.tanh(
            embedding_stability * 6
        )

        amplitude_score = clamp(
            amplitude / 0.08
        )

        pitch_score = (
            clamp(
                1 -
                min(abs(pitch - 180), 220)
                / 220
            )
            if pitch > 0
            else 0
        )

        energy_score = clamp(
            energy / 1200
        )

        duration_score = (
            clamp(
                1 -
                min(abs(duration - 1.8), 1.8)
                / 1.8
            )
            if duration > 0
            else 0
        )

        confidence = 100 * (

            0.34 * model_signal +

            0.22 * stability +

            0.14 * amplitude_score +

            0.12 * pitch_score +

            0.10 * energy_score +

            0.08 * duration_score

        )

        return round(
            clamp(
                confidence,
                0,
                100
            ),
            2
        )

    except Exception as e:

        print("AI Error:", e)

        return 0.0