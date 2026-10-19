"""
transcription_cloud.py — AssemblyAI-based transcription for cloud deployment.
Replaces Whisper (too heavy for Streamlit Cloud).
Free tier: 5 hours/month — https://www.assemblyai.com
"""

import os
import tempfile
from pathlib import Path
from typing import Optional

import assemblyai as aai
import streamlit as st

SUPPORTED_FORMATS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"}
MAX_FILE_SIZE_MB = 50

# Language codes AssemblyAI supports that overlap with our app
_LANG_MAP = {"en": "en", "ta": None}  # Tamil not supported by AAI — falls back to auto


def _get_client() -> aai.Transcriber:
    try:
        api_key = st.secrets["assemblyai"]["api_key"]
    except Exception:
        api_key = os.environ.get("ASSEMBLYAI_API_KEY", "")
    if not api_key or api_key == "your_assemblyai_api_key_here":
        raise ValueError(
            "AssemblyAI API key not configured. "
            "Add it to .streamlit/secrets.toml under [assemblyai] api_key."
        )
    aai.settings.api_key = api_key
    return aai.Transcriber()


def validate_audio_file(file_path: str) -> tuple[bool, str]:
    path = Path(file_path)
    if not path.exists():
        return False, "File not found."
    if path.suffix.lower() not in SUPPORTED_FORMATS:
        return False, f"Unsupported format '{path.suffix}'."
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return False, f"File too large ({size_mb:.1f} MB). Max: {MAX_FILE_SIZE_MB} MB."
    if path.stat().st_size == 0:
        return False, "File is empty."
    return True, ""


def transcribe(file_path: str, language: Optional[str] = None) -> dict:
    valid, err = validate_audio_file(file_path)
    if not valid:
        return {"text": "", "language": "unknown", "segments": [], "error": err}

    try:
        transcriber = _get_client()
        config = aai.TranscriptionConfig(
            language_code=_LANG_MAP.get(language) if language else None,
            language_detection=language is None,
            punctuate=True,
            format_text=True,
        )
        result = transcriber.transcribe(file_path, config=config)
        if result.status == aai.TranscriptStatus.error:
            return {"text": "", "language": "unknown", "segments": [], "error": result.error}

        detected = getattr(result, "language_code", None) or language or "en"
        return {
            "text": result.text or "",
            "language": detected,
            "segments": [],
            "error": None,
        }
    except Exception as exc:
        return {"text": "", "language": "unknown", "segments": [], "error": str(exc)}


def save_upload_to_temp(uploaded_file) -> str:
    suffix = Path(uploaded_file.name).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded_file.read())
        return tmp.name
