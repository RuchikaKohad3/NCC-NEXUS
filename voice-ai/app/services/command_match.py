import re
from rapidfuzz import fuzz


FUZZY_THRESHOLD = 85
TOKEN_THRESHOLD = 80


def normalize_text(text: str) -> str:
    """
    Normalize speech transcription for comparison.

    Handles:
    - case differences
    - punctuation
    - repeated letters caused by speech transcription
    - extra whitespace
    """

    text = text.lower().strip()

    # Remove punctuation
    text = re.sub(r"[^a-z\s]", " ", text)

    # Collapse repeated letters:
    # saavdhaan -> savdhaan
    # vishraam -> vishram
    # thaam -> tham
    text = re.sub(r"([a-z])\1+", r"\1", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def token_similarity(expected_token: str, recognized_token: str) -> float:
    """
    Compare two individual command words.
    """

    return fuzz.ratio(
        expected_token,
        recognized_token
    )


def command_similarity(expected: str, recognized: str) -> float:
    """
    Calculate command similarity without requiring Whisper
    to reproduce the entire sentence exactly.

    This allows Whisper to add surrounding words while still
    identifying the intended command.
    """

    expected_tokens = expected.split()
    recognized_tokens = recognized.split()

    if not expected_tokens or not recognized_tokens:
        return 0.0

    # Single-word commands such as:
    # Savdhan
    # Vishram
    # Tham
    if len(expected_tokens) == 1:

        best_score = max(
            token_similarity(expected_tokens[0], token)
            for token in recognized_tokens
        )

        return best_score

    # Multi-word commands such as:
    # Salami Shastr
    # Tez Chal
    # Dahine Mud
    #
    # Look for the best matching sequence of words inside
    # the transcription.

    best_score = 0.0
    expected_length = len(expected_tokens)

    for start in range(
        max(1, len(recognized_tokens) - expected_length + 2)
    ):
        window = recognized_tokens[
            start:start + expected_length
        ]

        if not window:
            continue

        token_scores = []

        for expected_token, recognized_token in zip(
            expected_tokens,
            window
        ):
            token_scores.append(
                token_similarity(
                    expected_token,
                    recognized_token
                )
            )

        if token_scores:
            window_score = sum(token_scores) / len(token_scores)
            best_score = max(best_score, window_score)

    return best_score


def compare_commands(
    expected_command: str,
    recognized_command: str
):
    """
    Generic voice-command matcher.

    The function does not contain any command-specific rules,
    so new commands automatically work without changing this file.
    """

    expected = normalize_text(expected_command)
    recognized = normalize_text(recognized_command)

    if not expected or not recognized:
        return {
            "expected": expected_command.strip(),
            "recognized": recognized_command.strip(),
            "accuracy": 0.0,
            "correct": False
        }

    # Exact normalized match
    if expected == recognized:
        return {
            "expected": expected_command.strip(),
            "recognized": recognized_command.strip(),
            "accuracy": 100.0,
            "correct": True
        }

    score = command_similarity(
        expected,
        recognized
    )

    correct = bool(score >= TOKEN_THRESHOLD)

    return {
        "expected": expected_command.strip(),
        "recognized": recognized_command.strip(),
        "accuracy": round(score, 2),
        "correct": correct
    }