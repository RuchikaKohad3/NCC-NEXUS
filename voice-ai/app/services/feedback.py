def generate_feedback(command_result, scoring):
    """
    Local structured fallback feedback for callers that do not use Gemini.
    """

    strengths = []
    improvements = []
    delivery = scoring["delivery"]

    if not command_result["correct"]:

        improvements.append(
            "The spoken command does not match the expected NCC command."
        )

    if delivery["volume"] < 70:

        improvements.append(
            "Increase your voice projection."
        )

    if delivery["clarity"] < 70:

        improvements.append(
            "Speak more clearly."
        )

    if delivery["pace"] < 70:

        improvements.append(
            "Maintain a steady speaking pace."
        )

    if delivery["confidence"] < 70:

        improvements.append(
            "Deliver the command with greater confidence."
        )

    if command_result["correct"]:
        strengths.append("The spoken command matches the expected NCC command.")

    if delivery["clarity"] >= 70:
        strengths.append("The command was delivered with acceptable clarity.")

    if len(improvements) == 0:

        improvements.append(
            "Keep practicing to maintain consistent command delivery."
        )

    return {
        "summary": "Core analysis completed without Gemini feedback.",
        "strengths": strengths[:2],
        "improvements": improvements[:2],
        "coach_tip": "Use the exact NCC wording and project from the diaphragm."
    }
