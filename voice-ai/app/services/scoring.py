from app.utils.helpers import clamp


def _score_near_target(value, target, tolerance):
    if target <= 0 or tolerance <= 0:
        return 0.0

    distance = abs(value - target)
    return clamp(1 - distance / tolerance, 0, 1) * 100


def calculate_score(command_result, ai_confidence, metrics):

    amplitude = metrics["amplitude"]
    pitch = metrics["pitch"]
    energy = metrics["energy"]
    duration = metrics["duration"]
    zero_crossing_rate = metrics.get("zero_crossing_rate", 0.0)

    command_accuracy = clamp(command_result["accuracy"], 0, 100)

    volume = _score_near_target(amplitude, target=0.055, tolerance=0.055)

    energy_score = clamp(energy / 1200, 0, 1) * 100
    articulation_score = _score_near_target(
        zero_crossing_rate,
        target=0.08,
        tolerance=0.08
    )
    clarity = 0.6 * energy_score + 0.4 * articulation_score

    pace = _score_near_target(
        duration,
        target=1.8,
        tolerance=1.8
    )

    pitch_score = (
        _score_near_target(
            pitch,
            target=180,
            tolerance=220
        )
        if pitch > 0
        else 0.0
    )

    pronunciation = (
        command_accuracy * 0.65 +
        ai_confidence * 0.25 +
        pitch_score * 0.10
    )

    overall = (

        command_accuracy * 0.35 +

        pronunciation * 0.20 +

        clarity * 0.15 +

        volume * 0.10 +

        pace * 0.10 +

        ai_confidence * 0.10

    )

    delivery = {
        "pronunciation": round(clamp(pronunciation, 0, 100), 2),
        "clarity": round(clamp(clarity, 0, 100), 2),
        "volume": round(clamp(volume, 0, 100), 2),
        "pace": round(clamp(pace, 0, 100), 2),
        "confidence": round(clamp(ai_confidence, 0, 100), 2)
    }

    return {

        "overall_score": round(clamp(overall, 0, 100), 2),

        "delivery": delivery

    }
