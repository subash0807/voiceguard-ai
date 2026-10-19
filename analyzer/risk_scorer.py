"""
risk_scorer.py — Explainable heuristic risk scoring with scam type classification.
"""

import math
from dataclasses import dataclass, field
from analyzer.phrase_detector import DetectionResult, CATEGORIES

RISK_LEVELS = [
    (75, "Very High", "🔴"),
    (50, "High",      "🟠"),
    (25, "Moderate",  "🟡"),
    (0,  "Low",       "🟢"),
]

CO_OCCURRENCE_BONUS = 5.0
HIGH_WEIGHT_THRESHOLD = 2.5

# ---------------------------------------------------------------------------
# Scam type classifier — maps category combinations to known scam types
# ---------------------------------------------------------------------------

SCAM_PROFILES: list[dict] = [
    {
        "name": "Banking / KYC Fraud",
        "icon": "🏦",
        "required": {"otp_credentials", "bank_verification"},
        "description": "Caller impersonates a bank official to steal account credentials or OTPs.",
        "real_cases": "Most common scam in India — NPCI reports 95,000+ cases annually.",
    },
    {
        "name": "Fake Arrest / Legal Threat",
        "icon": "⚖️",
        "required": {"threats", "payment_demand"},
        "description": "Caller claims to be a police/CBI officer and demands payment to avoid arrest.",
        "real_cases": "Enforcement Directorate impersonation scams caused ₹1,200 Cr losses in 2023.",
    },
    {
        "name": "Tech Support Scam",
        "icon": "💻",
        "required": {"tech_support_scam", "remote_access"},
        "description": "Fake Microsoft/Apple support agent claims your device is hacked and requests remote access.",
        "real_cases": "Microsoft reports 6,000+ tech support scam complaints per month globally.",
    },
    {
        "name": "Prize / Lottery Scam",
        "icon": "🎰",
        "required": {"prize_impersonation", "payment_demand"},
        "description": "Victim is told they won a prize but must pay a fee to claim it.",
        "real_cases": "KBC lottery scam is one of India's most reported phone frauds.",
    },
    {
        "name": "SIM / Telecom Fraud",
        "icon": "📱",
        "required": {"caller_identity_fraud", "otp_credentials"},
        "description": "Caller impersonates TRAI/DOT to block SIM and steal OTPs for account takeover.",
        "real_cases": "TRAI impersonation scams surged 300% in 2023 per CERT-In.",
    },
    {
        "name": "Remote Access / Device Takeover",
        "icon": "🖥️",
        "required": {"remote_access", "urgency"},
        "description": "Victim is tricked into installing AnyDesk/TeamViewer giving scammer full device control.",
        "real_cases": "RBI issued warnings in 2023 about AnyDesk-based banking fraud.",
    },
    {
        "name": "Emotional / Family Threat Scam",
        "icon": "😨",
        "required": {"emotional_manipulation", "secrecy"},
        "description": "Scammer threatens harm to family or reputation to extract money or information.",
        "real_cases": "Common in rural India — victims threatened with fake FIRs against family members.",
    },
    {
        "name": "Identity Theft",
        "icon": "🕵️",
        "required": {"personal_info_harvesting", "bank_verification"},
        "description": "Systematic collection of personal details to impersonate the victim.",
        "real_cases": "India saw 14.02 lakh cybercrime complaints in 2023 per NCRB.",
    },
]


@dataclass
class ScoredFinding:
    category_key: str
    label: str
    icon: str
    hit_count: int
    weight: float
    contribution: float
    description: str
    sample_phrases: list[str] = field(default_factory=list)


@dataclass
class RiskReport:
    score: int
    category: str
    icon: str
    confidence: str          # Low / Medium / High confidence in the assessment
    findings: list[ScoredFinding]
    total_categories_hit: int
    scam_type: dict | None   # matched scam profile or None
    manipulation_tactics: list[str]
    word_count: int
    disclaimer: str = (
        "⚠️ This score is a heuristic indicator only. "
        "It is not a statistically validated probability of fraud. "
        "Always verify independently before taking action."
    )


def _classify_scam(category_keys: set[str]) -> dict | None:
    for profile in SCAM_PROFILES:
        if profile["required"].issubset(category_keys):
            return profile
    # Partial match — return best partial
    best, best_score = None, 0
    for profile in SCAM_PROFILES:
        overlap = len(profile["required"] & category_keys)
        if overlap > best_score:
            best_score, best = overlap, profile
    return best if best_score >= 1 else None


def _confidence(score: int, categories_hit: int, word_count: int) -> str:
    if word_count < 20:
        return "Low"
    if categories_hit >= 3 and score >= 50:
        return "High"
    if categories_hit >= 2 or score >= 30:
        return "Medium"
    return "Low"


TACTIC_DESCRIPTIONS = {
    "urgency":                "⏱️ Time pressure — preventing rational decision-making",
    "threats":                "⚖️ Fear of authority — using fake legal threats",
    "secrecy":                "🤫 Isolation — cutting off access to trusted advisors",
    "emotional_manipulation": "😨 Emotional override — exploiting fear and panic",
    "prize_impersonation":    "🎭 False hope — luring with fake rewards",
    "caller_identity_fraud":  "🎭 Authority impersonation — faking official identity",
    "otp_credentials":        "🔑 Credential theft — direct extraction of secrets",
    "payment_demand":         "💸 Financial extraction — demanding immediate payment",
    "remote_access":          "💻 Device takeover — gaining physical system control",
    "bank_verification":      "🏦 Trust exploitation — mimicking bank procedures",
    "personal_info_harvesting":"🕵️ Profile building — collecting data for identity theft",
    "tech_support_scam":      "🖥️ Technical deception — fake device compromise claims",
}


def calculate_risk(detection: DetectionResult) -> RiskReport:
    findings: list[ScoredFinding] = []
    raw_score = 0.0
    high_weight_hits = 0
    word_count = sum(len(m.phrase.split()) for m in detection.matches if not m.negated)

    for cat_key, hit_count in detection.category_hits.items():
        cat_info = CATEGORIES.get(cat_key, {})
        weight = cat_info.get("weight", 1.0)
        contribution = weight * math.log1p(hit_count) * 10
        raw_score += contribution
        if weight >= HIGH_WEIGHT_THRESHOLD:
            high_weight_hits += 1

        samples = list({
            m.phrase for m in detection.matches
            if m.category == cat_key and not m.negated
        })[:3]

        findings.append(ScoredFinding(
            category_key=cat_key,
            label=cat_info.get("label", cat_key),
            icon=cat_info.get("icon", "⚠️"),
            hit_count=hit_count,
            weight=weight,
            contribution=round(contribution, 2),
            description=cat_info.get("description", ""),
            sample_phrases=samples,
        ))

    if high_weight_hits >= 2:
        raw_score += CO_OCCURRENCE_BONUS * high_weight_hits

    final_score = min(int(raw_score), 100)

    category_label, icon = "Low", "🟢"
    for threshold, label, ico in RISK_LEVELS:
        if final_score >= threshold:
            category_label, icon = label, ico
            break

    findings.sort(key=lambda f: f.contribution, reverse=True)

    hit_keys = set(detection.category_hits.keys())
    scam_type = _classify_scam(hit_keys)
    tactics = [TACTIC_DESCRIPTIONS[k] for k in detection.category_hits if k in TACTIC_DESCRIPTIONS]

    return RiskReport(
        score=final_score,
        category=category_label,
        icon=icon,
        confidence=_confidence(final_score, len(hit_keys), word_count),
        findings=findings,
        total_categories_hit=len(detection.category_hits),
        scam_type=scam_type,
        manipulation_tactics=tactics,
        word_count=word_count,
    )
