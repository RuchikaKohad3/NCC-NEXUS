import json

from app.models.gemini_model import generate_content
from app.prompts.drill_instructor import PROMPT


def fallback_feedback():
    return {
        "summary": "Unable to generate AI feedback.",
        "strengths": [],
        "improvements": [],
        "coach_tip": ""
    }


def _coerce_feedback(value):
    return {
        "summary": str(value.get("summary", "")),
        "strengths": list(value.get("strengths", []))[:2],
        "improvements": list(value.get("improvements", []))[:2],
        "coach_tip": str(value.get("coach_tip", ""))
    }


def generate_ai_feedback(data):
    if generate_content is None:
        return fallback_feedback()

    prompt = f"""
{PROMPT}

NCC Command Evaluation

Expected Command:
{data["expected"]}

Recognized Command:
{data["recognized"]}

Command Correct:
{data["correct"]}

Command Accuracy:
{data["accuracy"]} %

Overall Score:
{data["overall_score"]}

Pronunciation Score:
{data["pronunciation"]}

Voice Clarity:
{data["clarity"]}

Voice Projection:
{data["volume"]}

Speaking Pace:
{data["pace"]}

Confidence:
{data["confidence"]}

Raw Audio Metrics:
{json.dumps(data["raw_audio_metrics"], indent=2)}

Instructions:

1. First evaluate whether the cadet spoke the correct command.
2. If the command is incorrect, prioritize explaining the pronunciation/recognition issue.
3. Then evaluate pronunciation, clarity, confidence, volume and pace.
4. Never treat synonyms or English equivalents as correct.
5. Never invent or estimate metrics that are not listed above.
6. Never praise pronunciation if command accuracy is poor.
7. Return ONLY valid JSON.
"""

    try:

        response = generate_content(prompt)

        if response is None:
            return fallback_feedback()

        text = response.text.strip()

        text = text.replace("```json", "")
        text = text.replace("```", "").strip()

        parsed = json.loads(text)

        if not isinstance(parsed, dict):
            return fallback_feedback()

        return _coerce_feedback(parsed)

    except Exception as e:

        print("Gemini Error:", e)

        return fallback_feedback()
