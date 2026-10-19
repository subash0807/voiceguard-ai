"""
transcription.py — Whisper-based speech-to-text transcription.
Runs on CPU. Supports English, Tamil, and auto-detection.
"""

import os
import tempfile
from pathlib import Path
from typing import Optional

SUPPORTED_FORMATS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}
MAX_FILE_SIZE_MB = 50
WHISPER_MODEL = "base"  # change to "small" for better Tamil accuracy

# ---------------------------------------------------------------------------
# Inject FFmpeg into PATH at import time so Whisper can find it regardless
# of whether the terminal was restarted after winget install.
# ---------------------------------------------------------------------------
_FFMPEG_CANDIDATES = [
    r"C:\Users\subas\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin",
    r"C:\ffmpeg\bin",
    r"C:\Program Files\ffmpeg\bin",
    r"C:\Program Files (x86)\ffmpeg\bin",
]
for _p in _FFMPEG_CANDIDATES:
    if Path(_p).exists():
        _current = os.environ.get("PATH", "")
        if _p not in _current:
            os.environ["PATH"] = _p + os.pathsep + _current
        break

_model_cache = None


def _load_model():
    """Load Whisper model once and cache it in memory."""
    global _model_cache
    if _model_cache is None:
        import whisper
        _model_cache = whisper.load_model(WHISPER_MODEL, device="cpu")
    return _model_cache


def validate_audio_file(file_path: str) -> tuple[bool, str]:
    """Returns (is_valid, error_message)."""
    path = Path(file_path)
    if not path.exists():
        return False, "File not found."
    if path.suffix.lower() not in SUPPORTED_FORMATS:
        return False, f"Unsupported format '{path.suffix}'. Supported: {', '.join(SUPPORTED_FORMATS)}"
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return False, f"File too large ({size_mb:.1f} MB). Maximum: {MAX_FILE_SIZE_MB} MB."
    if path.stat().st_size == 0:
        return False, "File is empty."
    return True, ""


def transcribe(file_path: str, language: Optional[str] = None) -> dict:
    """
    Transcribe audio using Whisper (CPU).
    Returns {"text", "language", "segments", "error"}.
    """
    valid, err = validate_audio_file(file_path)
    if not valid:
        return {"text": "", "language": "unknown", "segments": [], "error": err}

    try:
        model = _load_model()
        options = {
            "fp16": False,
            "beam_size": 1,
            "best_of": 1,
            "condition_on_previous_text": False,
            "temperature": 0,
        }
        if language:
            options["language"] = language

        result = model.transcribe(file_path, **options)
        return {
            "text": result.get("text", "").strip(),
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", []),
            "error": None,
        }
    except Exception as exc:
        msg = str(exc)
        if "WinError 2" in msg or "No such file" in msg or "ffmpeg" in msg.lower():
            msg = (
                "FFmpeg not found or not accessible. "
                "Please STOP the app, open a NEW terminal, and run:\n"
                "py -3 -m streamlit run app.py\n"
                "FFmpeg path has been added to your user PATH — a new terminal will pick it up."
            )
        return {"text": "", "language": "unknown", "segments": [], "error": msg}


def save_upload_to_temp(uploaded_file) -> str:
    """Save Streamlit UploadedFile to a temp file. Caller must delete after use."""
    suffix = Path(uploaded_file.name).suffix.lower()
    Path("data").mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir="data") as tmp:
        tmp.write(uploaded_file.read())
        return tmp.name
