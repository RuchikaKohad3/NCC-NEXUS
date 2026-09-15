import librosa
import numpy as np


def extract_metrics(audio_path: str):
    """
    Extract acoustic speech features.
    """

    try:
        y, sr = librosa.load(
            audio_path,
            sr=16000,
            mono=True
        )
    except Exception as exc:
        raise ValueError("Invalid or unsupported audio file.") from exc

    if y.size == 0:
        raise ValueError("Audio file is empty.")

    amplitude = np.mean(np.abs(y))

    energy = np.sum(y ** 2)

    rms = librosa.feature.rms(y=y)[0]

    zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]

    pitches, _ = librosa.piptrack(
        y=y,
        sr=sr
    )

    pitch_values = pitches[pitches > 0]

    average_pitch = (
        float(pitch_values.mean())
        if len(pitch_values) > 0
        else 0.0
    )

    duration = librosa.get_duration(
        y=y,
        sr=sr
    )

    return {

        "audio": y,

        "sample_rate": sr,

        "amplitude": float(amplitude),

        "energy": float(energy),

        "pitch": average_pitch,

        "duration": float(duration),

        "rms": float(rms.mean()) if len(rms) > 0 else 0.0,

        "zero_crossing_rate": (
            float(zero_crossing_rate.mean())
            if len(zero_crossing_rate) > 0
            else 0.0
        )
    }
