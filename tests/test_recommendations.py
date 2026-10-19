"""
test_recommendations.py — Tests for the recommendations engine.
"""

from analyzer.phrase_detector import detect
from analyzer.risk_scorer import calculate_risk
from analyzer.recommendations import generate_recommendations


def test_otp_recommendation_present():
    text = "Please share your OTP with me right now."
    report = calculate_risk(detect(text))
    recs = generate_recommendations(report)
    assert any("OTP" in r["body"] for r in recs.specific)


def test_general_advice_always_present():
    report = calculate_risk(detect("Hello, how are you?"))
    recs = generate_recommendations(report)
    assert len(recs.general) >= 1


def test_high_risk_advice_shown_for_high_score():
    text = (
        "Give me your OTP immediately or you will be arrested. "
        "Transfer money now. Don't tell your family."
    )
    report = calculate_risk(detect(text))
    recs = generate_recommendations(report)
    if report.category in ("High", "Very High"):
        assert len(recs.high_risk) >= 1


def test_no_high_risk_advice_for_low_score():
    report = calculate_risk(detect("Good morning, have a nice day."))
    recs = generate_recommendations(report)
    assert recs.high_risk == []


def test_cybercrime_helpline_in_general_advice():
    report = calculate_risk(detect(""))
    recs = generate_recommendations(report)
    combined = " ".join(r["text"] for r in recs.general)
    assert "1930" in combined or "cybercrime.gov.in" in combined
