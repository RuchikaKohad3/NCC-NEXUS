import os
import tempfile
from pathlib import Path

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException
)

from app.services.analyzer import analyze_audio
from app.schemas.analysis import AnalysisResponse

router = APIRouter()

SUPPORTED_AUDIO_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".flac",
    ".ogg",
    ".webm"
}

SUPPORTED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/flac",
    "audio/ogg",
    "audio/webm",
    "video/webm"
}


@router.get("/health")
def health():

    return {

        "status": "running",
        "service": "NCC Voice AI"

    }


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(

    expectedCommand: str = Form(...),

    file: UploadFile = File(...)

):

    temp_path = None

    try:
        expected_command = expectedCommand.strip()

        if not expected_command:
            raise HTTPException(
                status_code=400,
                detail="expectedCommand is required."
            )

        extension = Path(file.filename or "").suffix.lower()

        if extension not in SUPPORTED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported audio file type."
            )

        if (
            file.content_type
            and file.content_type not in SUPPORTED_CONTENT_TYPES
        ):
            raise HTTPException(
                status_code=400,
                detail="Unsupported audio content type."
            )

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Audio file is required."
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as tmp:

            tmp.write(contents)

            temp_path = tmp.name

        result = analyze_audio(

            temp_path,

            expected_command

        )

        return result

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Voice analysis failed."
        ) from exc

    finally:

        if temp_path and os.path.exists(temp_path):

            os.unlink(temp_path)
