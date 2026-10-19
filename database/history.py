"""
history.py — SQLite-backed analysis history.
Audio files are never stored. Only transcripts and metadata are saved.
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path("data") / "voiceguard_history.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the analyses table if it does not exist."""
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at  TEXT    NOT NULL,
                filename    TEXT,
                language    TEXT,
                transcript  TEXT,
                risk_score  INTEGER,
                risk_category TEXT,
                findings_json TEXT
            )
        """)


def save_analysis(
    filename: str,
    language: str,
    transcript: str,
    risk_score: int,
    risk_category: str,
    findings: list[dict],
) -> int:
    """Insert one analysis record. Returns the new row id."""
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO analyses
                (created_at, filename, language, transcript, risk_score, risk_category, findings_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.utcnow().isoformat(timespec="seconds"),
                filename,
                language,
                transcript,
                risk_score,
                risk_category,
                json.dumps(findings),
            ),
        )
        return cur.lastrowid


def get_history(limit: int = 50) -> list[dict]:
    """Return the most recent analyses as a list of dicts."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, created_at, filename, language, risk_score, risk_category "
            "FROM analyses ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_analysis(record_id: int) -> dict | None:
    """Return a single full analysis record by id."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (record_id,)
        ).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["findings"] = json.loads(d.pop("findings_json", "[]"))
    return d


def delete_analysis(record_id: int) -> None:
    """Delete a single record by id."""
    with _connect() as conn:
        conn.execute("DELETE FROM analyses WHERE id = ?", (record_id,))


def delete_all_history() -> None:
    """Permanently delete all analysis records."""
    with _connect() as conn:
        conn.execute("DELETE FROM analyses")
