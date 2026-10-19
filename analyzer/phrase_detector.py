"""
phrase_detector.py — Detects scam and manipulation indicators in transcripts.
"""

import bisect
import re
from dataclasses import dataclass, field

@dataclass
class PatternMatch:
    category: str
    phrase: str
    start: int
    end: int
    context: str
    negated: bool = False

@dataclass
class DetectionResult:
    matches: list[PatternMatch] = field(default_factory=list)
    category_hits: dict[str, int] = field(default_factory=dict)
    flagged_spans: list[tuple[int, int]] = field(default_factory=list)

# ---------------------------------------------------------------------------
# Pattern catalogue — 12 categories, English + Tamil
# ---------------------------------------------------------------------------

CATEGORIES: dict[str, dict] = {
    "urgency": {
        "label": "Urgent Demand / Time Pressure",
        "weight": 1.5,
        "icon": "⏱️",
        "description": "Scammers create artificial urgency to prevent victims from thinking clearly or consulting others.",
        "patterns": [
            r"\bact\s+now\b", r"\bimmediately\b", r"\bright\s+now\b", r"\blast\s+chance\b",
            r"\bexpires?\s+(today|tonight|in\s+\d+\s+(minutes?|hours?))\b",
            r"\bwithin\s+\d+\s+(minutes?|hours?|days?)\b",
            r"\burgent(ly)?\b", r"\btime\s+(is\s+)?running\s+out\b", r"\bdon'?t\s+delay\b",
            r"\bfinal\s+(warning|notice|chance|opportunity)\b",
            r"\blast\s+(warning|notice|opportunity)\b",
            r"\bdeadline\s+(is|has\s+passed|today)\b",
            r"\bno\s+more\s+time\b", r"\bhurry\s+up\b", r"\bquickly\b",
            r"\bas\s+soon\s+as\s+possible\b", r"\basap\b",
            r"\byou\s+have\s+(only\s+)?\d+\s+(minutes?|hours?|seconds?)\b",
            r"\bஉடனே\b", r"\bவிரைவாக\b", r"\bதாமதிக்காதே\b",
            r"\bஇப்போதே\b", r"\bசீக்கிரம்\b",
        ],
    },
    "otp_credentials": {
        "label": "OTP / PIN / Password Request",
        "weight": 3.0,
        "icon": "🔑",
        "description": "Requesting OTPs, PINs or passwords is the most direct form of credential theft. No legitimate organization ever asks for these.",
        "patterns": [
            r"\b(share|send|give|tell|provide|read\s+out|dictate|type)\b.{0,40}\b(otp|one.?time.?password|pin|password|passcode)\b",
            r"\b(otp|one.?time.?password|pin|password|passcode)\b.{0,40}\b(share|send|give|tell|provide|read)\b",
            r"\bverification\s+code\b", r"\bsecurity\s+code\b", r"\bOTP\b",
            r"\bauthentication\s+code\b", r"\baccess\s+code\b",
            r"\btemporary\s+(password|pin|code)\b",
            r"\bone.?time\s+(code|pin|password)\b",
            r"\bsms\s+(code|otp|pin)\b",
            r"\bரகசிய\s+எண்\b", r"\bகடவுச்சொல்\b", r"\bOTP\s+சொல்லுங்கள்\b",
            r"\bகுறியீடு\s+சொல்லுங்கள்\b",
        ],
    },
    "payment_demand": {
        "label": "Unusual Payment / Money Transfer",
        "weight": 2.5,
        "icon": "💸",
        "description": "Demands for immediate payment, especially via unusual methods like gift cards or crypto, are hallmarks of fraud.",
        "patterns": [
            r"\b(transfer|send|deposit|pay)\b.{0,50}\b(money|funds?|amount|cash|rupees?|rs\.?|lakhs?|crores?)\b",
            r"\b(money|funds?|amount|cash|rupees?|rs\.?)\b.{0,50}\b(transfer|send|deposit|pay)\b",
            r"\bgift\s+card(s)?\b", r"\bitunes?\s+card\b", r"\bgoogle\s+play\s+card\b",
            r"\bcrypto(currency)?\b", r"\bbitcoin\b", r"\bethereumb\b", r"\busdt\b",
            r"\bwire\s+transfer\b", r"\bneft\b", r"\brtgs\b", r"\bimps\b",
            r"\bprocessing\s+fee\b", r"\bregistration\s+fee\b", r"\bsecurity\s+deposit\b",
            r"\btax\s+(clearance|payment|fee)\b",
            r"\brefundable\s+(deposit|amount|fee)\b",
            r"\bpay\s+(first|now|immediately|urgently)\b",
            r"\bsend\s+(money|cash|funds)\s+(to|via|through|using)\b",
            r"\bupi\s+(id|transfer|payment)\b",
            r"\bpaytm\b", r"\bphonepe\b", r"\bgpay\b",
            r"\bபணம்\s+அனுப்பு\b", r"\bபணம்\s+கட்டு\b",
            r"\bகட்டணம்\s+செலுத்து\b",
        ],
    },
    "threats": {
        "label": "Threats / Intimidation / Arrest Claims",
        "weight": 3.0,
        "icon": "⚖️",
        "description": "Fake threats of arrest, legal action or account suspension are used to panic victims into compliance.",
        "patterns": [
            r"\b(arrest|arrested|jail|prison|police|court|legal\s+action|lawsuit|sue)\b",
            r"\byour\s+(account|card)\s+(will\s+be\s+)?(blocked|suspended|frozen|closed|terminated)\b",
            r"\bcriminal\s+(charges?|case|record|complaint)\b",
            r"\bwarrant\b", r"\bfine\s+of\b", r"\bpenalty\b",
            r"\bfir\s+(registered|filed|lodged)\b",
            r"\bcyber\s+crime\s+(case|complaint|department)\b",
            r"\bmoney\s+laundering\b", r"\bfraud\s+case\b",
            r"\byour\s+(name|aadhaar|pan)\s+(is\s+)?(involved|linked|flagged|found)\b",
            r"\binterpol\b", r"\bed\s+(department|officer|raid)\b",
            r"\benforcement\s+directorate\b",
            r"\byou\s+will\s+(be\s+)?(arrested|jailed|prosecuted|charged)\b",
            r"\bsend\s+(police|officers)\s+to\s+your\b",
            r"\bகைது\b", r"\bசிறை\b", r"\bவழக்கு\b", r"\bதண்டனை\b",
            r"\bகைது\s+செய்யப்படுவீர்கள்\b", r"\bபோலீஸ்\b",
        ],
    },
    "secrecy": {
        "label": "Secrecy / Isolation Request",
        "weight": 2.0,
        "icon": "🤫",
        "description": "Asking victims to keep the call secret isolates them from people who might warn them.",
        "patterns": [
            r"\bdon'?t\s+tell\b", r"\bkeep\s+(this|it)\s+(secret|confidential|between\s+us)\b",
            r"\bdon'?t\s+(inform|contact|call)\b.{0,30}\b(family|wife|husband|parents?|police|bank|anyone)\b",
            r"\bnobody\s+(should|must)\s+know\b",
            r"\bstay\s+on\s+the\s+(line|call)\b",
            r"\bdon'?t\s+hang\s+up\b",
            r"\bkeep\s+this\s+(call|matter|issue)\s+(private|confidential|quiet)\b",
            r"\bdon'?t\s+discuss\s+(this|it)\s+with\b",
            r"\bthis\s+is\s+(strictly\s+)?confidential\b",
            r"\bfor\s+your\s+(own\s+)?safety\s+don'?t\s+tell\b",
            r"\bயாரிடமும்\s+சொல்லாதே\b", r"\bரகசியமாக\b",
            r"\bகுடும்பத்தினரிடம்\s+சொல்லாதே\b",
        ],
    },
    "prize_impersonation": {
        "label": "Fake Prize / Lottery / Impersonation",
        "weight": 2.0,
        "icon": "🎭",
        "description": "Impersonating government agencies or announcing fake prizes are classic social engineering tactics.",
        "patterns": [
            r"\b(won|win|winner|winning)\b.{0,40}\b(prize|lottery|lucky\s+draw|reward|cash)\b",
            r"\bcongratulations\b.{0,60}\b(selected|chosen|won|prize)\b",
            r"\bkbc\b", r"\bnarco(tics)?\s+(bureau|department|officer)\b",
            r"\b(rbi|sebi|trai|irdai|income\s+tax)\s+(officer|department|calling|helpline)\b",
            r"\bcbi\s+officer\b", r"\bcid\s+officer\b",
            r"\bprime\s+minister('?s)?\s+(office|relief|fund)\b",
            r"\bgovernment\s+(scheme|grant|subsidy|lottery)\b",
            r"\byou\s+(have\s+been\s+)?(selected|chosen|picked)\s+(for|as)\b",
            r"\bclaim\s+your\s+(prize|reward|winnings|money)\b",
            r"\byour\s+(mobile\s+number|sim|aadhaar)\s+(has\s+been\s+)?(selected|won|chosen)\b",
            r"\bமுதல்\s+பரிசு\b", r"\bலாட்டரி\b", r"\bவெற்றி\s+பரிசு\b",
        ],
    },
    "bank_verification": {
        "label": "Suspicious Bank / Account Verification",
        "weight": 2.0,
        "icon": "🏦",
        "description": "Fake KYC updates and account verification calls are used to steal banking credentials.",
        "patterns": [
            r"\b(verify|confirm|update|complete)\b.{0,40}\b(account|card|kyc|details?|information|profile)\b",
            r"\bkyc\s+(expired?|update|pending|incomplete|verification)\b",
            r"\bcard\s+(number|details?|cvv|expiry|expiration)\b",
            r"\baccount\s+number\b.{0,30}\b(share|provide|give|confirm|verify)\b",
            r"\bifsc\b", r"\biban\b",
            r"\bnet\s+banking\s+(credentials?|password|login)\b",
            r"\bmobile\s+banking\s+(pin|password|otp)\b",
            r"\bdebit\s+card\s+(number|pin|details?)\b",
            r"\bcredit\s+card\s+(number|cvv|details?|limit)\b",
            r"\baadhaar\s+(number|card|linked|otp)\b",
            r"\bpan\s+(card|number|details?)\b",
            r"\bகணக்கு\s+விவரம்\b", r"\bKYC\s+புதுப்பிக்க\b",
            r"\bவங்கி\s+விவரம்\b",
        ],
    },
    "remote_access": {
        "label": "Remote Access / Tech Support Scam",
        "weight": 2.5,
        "icon": "💻",
        "description": "Installing remote access tools gives scammers complete control of your device and all data on it.",
        "patterns": [
            r"\b(install|download)\b.{0,40}\b(anydesk|teamviewer|quicksupport|remote|app|software|tool)\b",
            r"\bscreen\s+share\b", r"\bremote\s+(access|control|desktop|session)\b",
            r"\ballow\s+(me|us)\s+to\s+(access|control|view|connect)\b",
            r"\bteamviewer\b", r"\banydesk\b", r"\bquicksupport\b",
            r"\bzoho\s+assist\b", r"\bsplashtop\b",
            r"\bshare\s+your\s+screen\b",
            r"\bwe\s+(need|want)\s+to\s+(access|connect\s+to)\s+your\s+(computer|phone|device)\b",
            r"\bரிமோட்\s+அணுகல்\b",
        ],
    },
    "caller_identity_fraud": {
        "label": "Fake Caller Identity / Authority Claim",
        "weight": 2.5,
        "icon": "🎭",
        "description": "Scammers impersonate bank officials, police, government officers or telecom companies to gain trust.",
        "patterns": [
            r"\b(calling|speaking)\s+from\s+(sbi|hdfc|icici|axis|kotak|pnb|boi|canara|rbi|sebi)\b",
            r"\bi\s+am\s+(a\s+)?(senior\s+)?(officer|official|manager|executive|inspector|detective)\b",
            r"\bthis\s+is\s+(a\s+)?(official|government|bank|police|cbi|cid|trai|rbi)\s+(call|notice|alert)\b",
            r"\byour\s+(bank|telecom|service)\s+provider\s+(is\s+calling|calling\s+you)\b",
            r"\btelecom\s+(regulatory|department|authority)\b",
            r"\btrai\s+(officer|department|notice)\b",
            r"\byour\s+(sim|mobile|number)\s+(will\s+be\s+)?(blocked|disconnected|deactivated)\b",
            r"\bdot\s+(officer|department|notice)\b",
            r"\bverified\s+(government|bank|official)\s+caller\b",
            r"\bofficial\s+(helpline|number|representative)\b",
        ],
    },
    "personal_info_harvesting": {
        "label": "Personal Information Harvesting",
        "weight": 2.0,
        "icon": "🕵️",
        "description": "Collecting personal details like Aadhaar, PAN, date of birth or address builds a profile for identity theft.",
        "patterns": [
            r"\b(confirm|verify|provide|share|give)\b.{0,30}\b(date\s+of\s+birth|dob|address|full\s+name)\b",
            r"\baadhaar\s+(number|card|details?)\b",
            r"\bpan\s+(number|card|details?)\b",
            r"\bpassport\s+(number|details?)\b",
            r"\bvoter\s+id\b",
            r"\bdriving\s+licence\s+(number|details?)\b",
            r"\bmother'?s\s+maiden\s+name\b",
            r"\bdate\s+of\s+birth\b",
            r"\bregistered\s+(mobile|email|address)\b",
            r"\bpincode\b", r"\bzip\s+code\b",
            r"\bnominee\s+(name|details?)\b",
            r"\bவீட்டு\s+முகவரி\b", r"\bஆதார்\s+எண்\b",
        ],
    },
    "emotional_manipulation": {
        "label": "Emotional Manipulation / Fear Tactics",
        "weight": 1.5,
        "icon": "😨",
        "description": "Creating fear, shame or panic overrides rational thinking and makes victims more compliant.",
        "patterns": [
            r"\byour\s+(family|children|parents?|wife|husband)\s+(will\s+be\s+)?(affected|harmed|arrested|embarrassed)\b",
            r"\bthis\s+is\s+(very\s+)?(serious|critical|dangerous|urgent|important)\b",
            r"\byou\s+(are\s+in\s+)?(serious\s+)?(trouble|danger|problem)\b",
            r"\bdon'?t\s+(panic|worry|be\s+scared)\b",
            r"\bwe\s+are\s+trying\s+to\s+(help|save|protect)\s+you\b",
            r"\byour\s+(reputation|career|life)\s+(is\s+at\s+)?(risk|stake|danger)\b",
            r"\bthink\s+about\s+your\s+(family|children|future)\b",
            r"\bsave\s+yourself\b",
            r"\bcooperate\s+(with\s+us|now|immediately)\b",
            r"\bif\s+you\s+(don'?t|fail\s+to|refuse\s+to)\b.{0,30}\b(pay|cooperate|comply|respond)\b",
            r"\bஉங்கள்\s+குடும்பம்\b", r"\bபயப்படாதீர்கள்\b",
        ],
    },
    "tech_support_scam": {
        "label": "Tech Support / Device Compromise Claim",
        "weight": 2.0,
        "icon": "🖥️",
        "description": "Fake virus alerts and device compromise claims trick users into paying for fake support services.",
        "patterns": [
            r"\byour\s+(computer|phone|device|system)\s+(has\s+been\s+)?(hacked|compromised|infected|virus)\b",
            r"\bvirus\s+(detected|found|alert)\b",
            r"\bmalware\s+(detected|found|alert)\b",
            r"\byour\s+(ip\s+address|device)\s+(has\s+been\s+)?(flagged|blacklisted|reported)\b",
            r"\bmicrosoft\s+(support|calling|alert|warning)\b",
            r"\bwindows\s+(support|alert|error|warning)\b",
            r"\bapple\s+(support|calling|alert)\b",
            r"\byour\s+(subscription|license|warranty)\s+(has\s+)?(expired|ending)\b",
            r"\btech(nical)?\s+support\s+(calling|team|department)\b",
            r"\bwe\s+detected\s+(suspicious|unusual)\s+activity\b",
            r"\byour\s+data\s+(is\s+at\s+risk|will\s+be\s+deleted|has\s+been\s+stolen)\b",
        ],
    },
}

# ---------------------------------------------------------------------------
# Pre-compile all patterns once at import time
# ---------------------------------------------------------------------------

_COMPILED: dict[str, list[re.Pattern]] = {}
for _cat_key, _cat_info in CATEGORIES.items():
    _compiled_list = []
    for _pat in _cat_info["patterns"]:
        try:
            _compiled_list.append(re.compile(_pat, re.IGNORECASE | re.UNICODE))
        except re.error:
            pass
    _COMPILED[_cat_key] = _compiled_list

# ---------------------------------------------------------------------------
# Negation detection
# ---------------------------------------------------------------------------

NEGATION_WORDS = re.compile(
    r"\b(not|never|no|don'?t|didn'?t|won'?t|wouldn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|"
    r"இல்லை|வேண்டாம்|இல்ல)\b",
    re.IGNORECASE,
)
NEGATION_WINDOW = 60


def _is_negated(text: str, match_start: int) -> bool:
    window_start = max(0, match_start - NEGATION_WINDOW)
    return bool(NEGATION_WORDS.search(text, window_start, match_start))


def _context_snippet(text: str, start: int, end: int, window: int = 80) -> str:
    s = max(0, start - window // 2)
    e = min(len(text), end + window // 2)
    snippet = text[s:e].replace("\n", " ")
    return f"…{snippet}…" if s > 0 or e < len(text) else snippet


def _overlaps(seen: list[tuple[int, int]], start: int, end: int) -> bool:
    idx = bisect.bisect_right(seen, (start, end)) - 1
    if idx >= 0 and seen[idx][0] <= start and end <= seen[idx][1]:
        return True
    if idx + 1 < len(seen) and seen[idx + 1][0] <= start and end <= seen[idx + 1][1]:
        return True
    return False


def detect(text: str) -> DetectionResult:
    result = DetectionResult()
    if not text or not text.strip():
        return result

    seen_spans: list[tuple[int, int]] = []

    for cat_key, compiled_patterns in _COMPILED.items():
        category_matches: list[PatternMatch] = []

        for compiled in compiled_patterns:
            for m in compiled.finditer(text):
                if _overlaps(seen_spans, m.start(), m.end()):
                    continue
                bisect.insort(seen_spans, (m.start(), m.end()))
                pm = PatternMatch(
                    category=cat_key,
                    phrase=m.group(),
                    start=m.start(),
                    end=m.end(),
                    context=_context_snippet(text, m.start(), m.end()),
                    negated=_is_negated(text, m.start()),
                )
                category_matches.append(pm)

        active = [pm for pm in category_matches if not pm.negated]
        if active:
            result.category_hits[cat_key] = len(active)
            result.matches.extend(active)
            result.flagged_spans.extend((pm.start, pm.end) for pm in active)
        result.matches.extend(pm for pm in category_matches if pm.negated)

    result.matches.sort(key=lambda pm: pm.start)
    return result


def highlight_transcript(text: str, matches: list[PatternMatch]) -> str:
    if not text or not matches:
        return text
    active = sorted([m for m in matches if not m.negated], key=lambda m: m.start)
    parts: list[str] = []
    cursor = 0
    for m in active:
        if m.start < cursor:
            continue
        cat_info = CATEGORIES.get(m.category, {})
        color_map = {
            3.0: "linear-gradient(90deg,#7f1d1d,#b91c1c)",
            2.5: "linear-gradient(90deg,#7c2d12,#c2410c)",
            2.0: "linear-gradient(90deg,#713f12,#a16207)",
            1.5: "linear-gradient(90deg,#1e3a5f,#1d4ed8)",
        }
        weight = cat_info.get("weight", 1.5)
        bg = color_map.get(weight, color_map[1.5])
        parts.append(text[cursor:m.start])
        parts.append(
            f'<mark style="background:{bg};color:white;padding:2px 6px;'
            f'border-radius:4px;font-weight:600;cursor:help;" '
            f'title="{cat_info.get("label","")}">{text[m.start:m.end]}</mark>'
        )
        cursor = m.end
    parts.append(text[cursor:])
    return "".join(parts)
