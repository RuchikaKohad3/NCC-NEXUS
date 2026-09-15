from app.services.speech_metrics import extract_metrics
from app.services.speech_to_text import transcribe
from app.services.command_match import compare_commands
from app.services.ai_confidence import compute_ai_confidence
from app.services.scoring import calculate_score
from app.services.gemini_feedback import generate_ai_feedback


def analyze_audio(audio_path, expected_command):

    metrics = extract_metrics(audio_path)

    recognized_command = transcribe(
    audio_path,
    metrics["audio"],
    expected_command
)

    command_result = compare_commands(
        expected_command,
        recognized_command
    )

    ai_confidence = compute_ai_confidence(
        metrics
    )

    scoring = calculate_score(
        command_result,
        ai_confidence,
        metrics
    )

    raw_audio_metrics = {
        "amplitude": round(metrics["amplitude"], 4),
        "pitch": round(metrics["pitch"], 2),
        "energy": round(metrics["energy"], 2),
        "duration": round(metrics["duration"], 2)
    }

    feedback_data = {
        "expected": command_result["expected"],
        "recognized": command_result["recognized"],
        "correct": command_result["correct"],
        "accuracy": command_result["accuracy"],
        "overall_score": scoring["overall_score"],
        "pronunciation": scoring["delivery"]["pronunciation"],
        "clarity": scoring["delivery"]["clarity"],
        "volume": scoring["delivery"]["volume"],
        "pace": scoring["delivery"]["pace"],
        "confidence": scoring["delivery"]["confidence"],
        "raw_audio_metrics": raw_audio_metrics
    }

    ai_feedback = generate_ai_feedback(feedback_data)

    return {

        "overall_score": scoring["overall_score"],

        "command": command_result,

        "delivery": scoring["delivery"],

        "raw_audio_metrics": raw_audio_metrics,

        "ai_feedback": ai_feedback

    }
