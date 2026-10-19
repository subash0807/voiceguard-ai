# VoiceGuard AI 🛡️
**Speech-to-Text Scam and Manipulation Analyzer**

A local, privacy-first web application that transcribes audio recordings, detects scam and manipulation indicators, calculates a risk score, and recommends safe next steps. Supports English and Tamil.

---

## Quick Start

### 1. Prerequisites
- Python 3.11
- [FFmpeg](https://ffmpeg.org/download.html) installed and added to PATH
  - Windows: download from https://www.gyan.dev/ffmpeg/builds/, extract, add `bin/` to System PATH
- (Optional) Miniconda for environment isolation

### 2. Install dependencies

Open a terminal in the `Voiceagent` folder and run:

```bash
pip install -r requirements.txt
```

> Whisper and PyTorch are large downloads (~1–2 GB). This is a one-time install.
> The first run will also download the Whisper `base` model (~145 MB).

### 3. Run the application

```bash
streamlit run app.py
```

Open your browser at **http://localhost:8501**

---

## Running Tests

```bash
pytest tests/ -v
```

Expected output: all tests pass. Tests do NOT require Whisper or audio files — they test the detection and scoring logic only.

---

## Project Structure

```
Voiceagent/
├── app.py                        # Streamlit dashboard
├── requirements.txt
├── README.md
├── .gitignore
├── analyzer/
│   ├── transcription.py          # Whisper STT (CPU mode)
│   ├── phrase_detector.py        # Regex + NLP pattern matching
│   ├── risk_scorer.py            # Weighted heuristic scoring
│   └── recommendations.py       # Context-aware safety advice
├── database/
│   └── history.py                # SQLite CRUD
├── tests/
│   ├── test_phrase_detector.py
│   ├── test_risk_scorer.py
│   └── test_recommendations.py
└── data/                         # Temp files + SQLite DB (gitignored)
```

---

## Architecture

```
Audio Upload → Whisper (CPU) → Transcript
                                    ↓
                          Phrase Detector (regex, English + Tamil)
                                    ↓
                          Risk Scorer (weighted, capped 0–100)
                                    ↓
                          Recommendations Engine
                                    ↓
                          SQLite History + Export (JSON/CSV)
```

---

## Adding New Patterns

Edit `analyzer/phrase_detector.py` → `CATEGORIES` dict.
Each category entry has:
- `label` — display name
- `weight` — severity (1.0–3.0)
- `patterns` — list of Python regex strings

---

## Limitations

- Risk score is a **heuristic**, not a statistically validated fraud probability.
- Whisper `base` model may have lower accuracy for Tamil or noisy audio. Switch to `small` by changing `WHISPER_MODEL` in `transcription.py`.
- Transcription speed depends on CPU performance (~1–3× real-time on modern laptops).
- Pattern matching uses regex; it cannot understand full conversational context.
- Negation detection uses a simple window heuristic and may miss complex negations.

---

## Privacy

- Audio files are **never stored permanently**. Temp files are deleted immediately after transcription.
- Transcripts are stored locally in `data/voiceguard_history.db` (SQLite).
- No data is sent to any external server.
- You can delete all history from the History page in the app.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ffmpeg not found` | Install FFmpeg and add its `bin/` folder to Windows PATH |
| Whisper model download fails | Check internet connection; model downloads on first run |
| `torch` install fails | Run `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| Tamil transcription poor | Change `WHISPER_MODEL = "small"` in `transcription.py` |
| App runs slowly | Normal on CPU; `base` model is the fastest option |

---

## Cybercrime Reporting (India)

- **Helpline:** 1930
- **Portal:** https://cybercrime.gov.in
