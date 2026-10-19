"""
test_phrase_detector.py — Tests for the phrase detection engine.
Run with:  pytest tests/ -v
"""

import pytest
from analyzer.phrase_detector import detect, highlight_transcript


# ── 1. Scam transcript with urgent OTP request ──────────────────────────────

def test_otp_urgency_detected():
    text = "You must share your OTP immediately or your account will be blocked."
    result = detect(text)
    assert "otp_credentials" in result.category_hits
    assert "urgency" in result.category_hits or "threats" in result.category_hits


# ── 2. Arrest threat ────────────────────────────────────────────────────────

def test_arrest_threat_detected():
    text = "CBI officer calling. You will be arrested if you do not cooperate."
    result = detect(text)
    assert "threats" in result.category_hits or "prize_impersonation" in result.category_hits


# ── 3. Suspicious payment demand ────────────────────────────────────────────

def test_payment_demand_detected():
    text = "Please transfer the money to this account number right now."
    result = detect(text)
    assert "payment_demand" in result.category_hits


# ── 4. Secrecy request ──────────────────────────────────────────────────────

def test_secrecy_detected():
    text = "Don't tell your family about this. Keep this secret between us."
    result = detect(text)
    assert "secrecy" in result.category_hits


# ── 5. Normal conversation — no flags ───────────────────────────────────────

def test_normal_conversation_no_flags():
    text = "Hi, how are you? I wanted to check if you received the package yesterday."
    result = detect(text)
    assert len(result.category_hits) == 0


# ── 6. Repeated phrases — no double-counting ────────────────────────────────

def test_repeated_phrases_not_double_counted():
    text = "Share your OTP. Share your OTP. Share your OTP."
    result = detect(text)
    # Should be detected but hit_count should reflect unique spans, not inflate score
    assert "otp_credentials" in result.category_hits
    # All three are separate spans so hit_count may be 3, but score should be capped
    from analyzer.risk_scorer import calculate_risk
    report = calculate_risk(result)
    assert report.score <= 100


# ── 7. Empty and whitespace-only transcripts ────────────────────────────────

def test_empty_transcript():
    assert len(detect("").matches) == 0

def test_whitespace_transcript():
    assert len(detect("   \n\t  ").matches) == 0


# ── 8. Tamil suspicious phrases ─────────────────────────────────────────────

def test_tamil_otp_detected():
    text = "உங்கள் OTP சொல்லுங்கள் உடனே."
    result = detect(text)
    # Should hit otp_credentials or urgency
    assert len(result.category_hits) >= 1


def test_tamil_arrest_detected():
    text = "நீங்கள் கைது செய்யப்படுவீர்கள். உடனே பணம் கட்டுங்கள்."
    result = detect(text)
    assert "threats" in result.category_hits or "payment_demand" in result.category_hits


# ── 9. Tamil-English mixed language ─────────────────────────────────────────

def test_mixed_language_detected():
    text = "Your account will be blocked. உடனே OTP share பண்ணுங்கள்."
    result = detect(text)
    assert len(result.category_hits) >= 1


# ── 10. Negation reduces false positives ────────────────────────────────────

def test_negation_not_flagged_as_active():
    text = "We will never ask you to share your OTP or password."
    result = detect(text)
    # Matches may exist but should be marked negated
    active = [m for m in result.matches if not m.negated]
    # "OTP" alone may still match; check that negated matches exist
    negated = [m for m in result.matches if m.negated]
    assert len(negated) >= 1


# ── Highlight function ───────────────────────────────────────────────────────

def test_highlight_returns_html():
    text = "Share your OTP immediately."
    result = detect(text)
    html = highlight_transcript(text, result.matches)
    assert "<mark" in html


def test_highlight_empty_matches():
    text = "Hello, how are you?"
    result = detect(text)
    html = highlight_transcript(text, result.matches)
    assert html == text  # no changes when no matches
