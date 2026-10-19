"""
recommendations.py — Context-aware safety recommendations with real helplines and action plans.
"""

from dataclasses import dataclass, field
from analyzer.risk_scorer import RiskReport

CATEGORY_ADVICE: dict[str, dict] = {
    "otp_credentials": {
        "icon": "🔑",
        "title": "Never Share OTP or Password",
        "body": (
            "No bank, government body, or telecom company will EVER ask for your OTP, PIN, or password. "
            "If someone asks, it is a scam — hang up immediately. "
            "An OTP shared even once can drain your entire account within seconds."
        ),
    },
    "payment_demand": {
        "icon": "💸",
        "title": "Do Not Transfer Money Under Pressure",
        "body": (
            "Legitimate organizations never demand immediate payment via UPI, gift cards, or crypto. "
            "Verify any payment request by calling the organization directly using the number on their official website. "
            "Once money is transferred via UPI, recovery is extremely difficult."
        ),
    },
    "threats": {
        "icon": "⚖️",
        "title": "Fake Arrest Threats Are Illegal Intimidation",
        "body": (
            "Real police or CBI officers do NOT call to demand money. "
            "They serve physical notices. Hang up and call your local police station to verify. "
            "File a complaint at cybercrime.gov.in if threatened."
        ),
    },
    "urgency": {
        "icon": "⏱️",
        "title": "Slow Down — Urgency Is a Manipulation Tool",
        "body": (
            "Artificial time pressure is designed to stop you from thinking clearly. "
            "Any legitimate issue can wait 30 minutes for you to verify independently. "
            "Tell the caller you will call back on the official number."
        ),
    },
    "secrecy": {
        "icon": "🤫",
        "title": "Secrecy Requests Are a Major Red Flag",
        "body": (
            "Any caller who asks you to keep the conversation secret is trying to isolate you. "
            "Immediately tell a trusted family member or friend about the call. "
            "Scammers rely on isolation — breaking it often stops the scam."
        ),
    },
    "prize_impersonation": {
        "icon": "🎭",
        "title": "Unsolicited Prizes Are Always Scams",
        "body": (
            "You cannot win a lottery you never entered. "
            "KBC, government schemes, and RBI never announce winners by phone. "
            "Verify by visiting the official website directly — never through a link sent by the caller."
        ),
    },
    "bank_verification": {
        "icon": "🏦",
        "title": "Call Your Bank Directly",
        "body": (
            "Never provide account numbers, card details, CVV, or KYC information to an incoming caller. "
            "Call your bank using the number printed on the back of your card or on their official website. "
            "Banks never ask for full card numbers or CVV over the phone."
        ),
    },
    "remote_access": {
        "icon": "💻",
        "title": "Never Install Apps at a Caller's Request",
        "body": (
            "AnyDesk, TeamViewer, and QuickSupport give the installer complete control of your device. "
            "If already installed, uninstall immediately and change all passwords. "
            "Run a full antivirus scan and contact your bank if banking apps were open."
        ),
    },
    "caller_identity_fraud": {
        "icon": "🎭",
        "title": "Verify the Caller's Identity Independently",
        "body": (
            "Hang up and call the organization back using the official number from their website. "
            "TRAI, RBI, and police do not call to block SIMs or demand payments. "
            "Caller ID can be spoofed — a number appearing official does not mean it is."
        ),
    },
    "personal_info_harvesting": {
        "icon": "🕵️",
        "title": "Protect Your Personal Details",
        "body": (
            "Never share Aadhaar, PAN, date of birth, or address with an unsolicited caller. "
            "This information is used to impersonate you or access your financial accounts. "
            "If shared, monitor your credit report and bank statements closely."
        ),
    },
    "emotional_manipulation": {
        "icon": "😨",
        "title": "Recognize Emotional Manipulation",
        "body": (
            "Scammers deliberately create fear and panic to override your judgment. "
            "Take a breath, hang up, and talk to a trusted person before doing anything. "
            "No real emergency requires you to act within minutes on a phone call."
        ),
    },
    "tech_support_scam": {
        "icon": "🖥️",
        "title": "Microsoft and Apple Never Call You Unsolicited",
        "body": (
            "Tech companies do not proactively call customers about viruses or hacks. "
            "If you see a pop-up with a phone number, do not call it — close the browser. "
            "Run a legitimate antivirus scan if concerned about your device."
        ),
    },
}

GENERAL_ADVICE = [
    {"icon": "📞", "text": "Hang up and call back using the official number from the organization's website — never the number the caller gave you."},
    {"icon": "👨‍👩‍👧", "text": "Talk to a trusted family member or friend before taking any action. Scammers rely on isolation."},
    {"icon": "🚔", "text": "Report to Indian Cybercrime Helpline: **1930** | File online: **cybercrime.gov.in**"},
    {"icon": "🏦", "text": "If you shared banking details, call your bank's fraud helpline immediately to freeze your account."},
]

HIGH_RISK_ADVICE = [
    "🚨 STOP — Do NOT share any more information or make any payment.",
    "📵 Hang up the call immediately.",
    "🏦 If you already shared banking details, call your bank's 24/7 fraud line NOW.",
    "📋 Note down the caller's number, time, and what was said — you will need this for the complaint.",
]

BANK_HELPLINES = [
    {"bank": "SBI", "number": "1800-11-2211", "fraud": "1800-111-109"},
    {"bank": "HDFC", "number": "1800-202-6161", "fraud": "1800-202-6161"},
    {"bank": "ICICI", "number": "1800-1080", "fraud": "1800-1080"},
    {"bank": "Axis", "number": "1800-419-5959", "fraud": "1800-419-5959"},
    {"bank": "Kotak", "number": "1860-266-2666", "fraud": "1860-266-2666"},
    {"bank": "PNB", "number": "1800-180-2222", "fraud": "1800-180-2222"},
    {"bank": "BOI", "number": "1800-220-229", "fraud": "1800-220-229"},
    {"bank": "Canara", "number": "1800-425-0018", "fraud": "1800-425-0018"},
]

EMERGENCY_CONTACTS = [
    {"name": "Cybercrime Helpline", "number": "1930", "available": "24/7"},
    {"name": "Police", "number": "100", "available": "24/7"},
    {"name": "Women Helpline", "number": "1091", "available": "24/7"},
    {"name": "RBI Ombudsman", "number": "14448", "available": "Mon–Sat 9AM–5PM"},
    {"name": "TRAI", "number": "1800-110-420", "available": "Mon–Fri 9AM–6PM"},
]


@dataclass
class RecommendationSet:
    specific: list[dict]
    general: list[dict]
    high_risk: list[str]
    bank_helplines: list[dict]
    emergency_contacts: list[dict]
    action_steps: list[str]


def _action_steps(report: RiskReport) -> list[str]:
    steps = ["1️⃣ Hang up the call immediately if still ongoing."]
    keys = {f.category_key for f in report.findings}

    if "otp_credentials" in keys or "bank_verification" in keys:
        steps.append("2️⃣ Call your bank's fraud helpline to freeze your account if any details were shared.")
    if "remote_access" in keys:
        steps.append("3️⃣ Uninstall AnyDesk/TeamViewer immediately. Change all passwords from a different device.")
    if "personal_info_harvesting" in keys:
        steps.append("4️⃣ Monitor your Aadhaar usage at resident.uidai.gov.in and check your CIBIL credit report.")
    if report.category in ("High", "Very High"):
        steps.append("5️⃣ File a complaint at cybercrime.gov.in or call 1930 with the caller's number and call time.")
    steps.append(f"{'6️⃣' if len(steps) >= 5 else str(len(steps)+1)+'️⃣'} Tell a trusted family member about this call.")
    return steps


def generate_recommendations(report: RiskReport) -> RecommendationSet:
    specific = []
    seen: set[str] = set()
    for finding in report.findings:
        advice = CATEGORY_ADVICE.get(finding.category_key)
        if advice and finding.category_key not in seen:
            specific.append(advice)
            seen.add(finding.category_key)

    high_risk = HIGH_RISK_ADVICE if report.category in ("High", "Very High") else []

    return RecommendationSet(
        specific=specific,
        general=GENERAL_ADVICE,
        high_risk=high_risk,
        bank_helplines=BANK_HELPLINES,
        emergency_contacts=EMERGENCY_CONTACTS,
        action_steps=_action_steps(report),
    )
