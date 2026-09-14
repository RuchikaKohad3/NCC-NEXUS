import subprocess

from app.models.whisper_model import model


def transcribe(
    audio_path: str,
    audio=None,
    expected_command: str = ""
) -> str:
    """
    Convert speech to text using Whisper.

    The expected command is provided as contextual guidance so
    Whisper is less likely to convert Indian drill commands into
    unrelated English words.
    """

    try:
        prompt = (
            f"NCC drill command: {expected_command.strip()}. "
            "Transcribe the spoken command in Roman letters. "
            "Preserve the command wording as closely as possible."
            if expected_command.strip()
            else None
        )

        result = model.transcribe(
            audio if audio is not None else audio_path,
            language="en",
            initial_prompt=prompt,
            fp16=False,
            temperature=0,
            condition_on_previous_text=False
        )

    except FileNotFoundError as exc:
        raise RuntimeError(
            "Speech transcription failed because ffmpeg is not available."
        ) from exc

    except subprocess.CalledProcessError as exc:
        raise ValueError(
            "Invalid or unsupported audio file."
        ) from exc

    except Exception as exc:
        raise RuntimeError(
            "Speech transcription failed."
        ) from exc

    text_field = result.get("text", "")

    if isinstance(text_field, list):
        text = " ".join(
            s.strip()
            for s in text_field
        ).strip()
    else:
        text = str(text_field).strip()

    return text