"""
test_risk_scorer.py — Tests for the risk scoring engine.
"""

from analyzer.phrase_detector import detect
from analyzer.risk_scorer import calculate_risk


def test_score_zero_for_clean_text():
    result = detect("Good morning, how can I help you today?")
    report = calculate_risk(result)
    assert report.score == 0
    assert report.category == "Low"


def test_score_bounded_at_100():
    # Pile on every category
    text = (
        "Share your OTP immediately or you will be arrested. "
        "Transfer money now. Don't tell your family. "
        "You won a lottery prize. Install AnyDesk. "
        "Verify your KYC account details urgently."
    )
    result = detect(text)
    report = calculate_risk(result)
    assert 0 <= report.score <= 100


def test_high_risk_category_for_multiple_indicators():
    text = (
        "Give me your OTP right now or you will be arrested. "
        "Transfer money immediately and don't tell anyone."
    )
    result = detect(text)
    report = calculate_risk(result)
    assert report.category in ("High", "Very High")


def test_moderate_risk_single_indicator():
    text = "Please act urgently and respond as soon as possible."
    result = detect(text)
    report = calculate_risk(result)
    # Single low-weight indicator should not reach High
    assert report.score < 75


def test_findings_sorted_by_contribution():
    text = "Share your OTP now or you will be arrested and your account blocked."
    result = detect(text)
    report = calculate_risk(result)
    if len(report.findings) >= 2:
        contributions = [f.contribution for f in report.findings]
        assert contributions == sorted(contributions, reverse=True)


def test_report_has_disclaimer():
    result = detect("")
    report = calculate_risk(result)
    assert "heuristic" in report.disclaimer.lower()
