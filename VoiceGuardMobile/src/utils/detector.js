// src/utils/detector.js
// Scam & manipulation phrase detector — ported from Python analyzer

export const CATEGORIES = {
  urgency: {
    label: 'Urgent Demand / Time Pressure', icon: '⏱️', weight: 1.5,
    description: 'Scammers create artificial urgency to prevent rational thinking.',
    patterns: [
      /\bact\s+now\b/i, /\bimmediately\b/i, /\bright\s+now\b/i, /\blast\s+chance\b/i,
      /\burgent(ly)?\b/i, /\btime\s+(is\s+)?running\s+out\b/i, /\bdon'?t\s+delay\b/i,
      /\bfinal\s+(warning|notice|chance)\b/i, /\bhurry\s+up\b/i, /\bquickly\b/i,
      /\bwithin\s+\d+\s+(minutes?|hours?|days?)\b/i,
      /\byou\s+have\s+(only\s+)?\d+\s+(minutes?|hours?)\b/i,
      /\bஉடனே\b/, /\bவிரைவாக\b/, /\bதாமதிக்காதே\b/, /\bஇப்போதே\b/,
    ],
  },
  otp_credentials: {
    label: 'OTP / PIN / Password Request', icon: '🔑', weight: 3.0,
    description: 'No legitimate organization ever asks for OTPs or passwords.',
    patterns: [
      /\b(share|send|give|tell|provide|read\s+out).{0,40}(otp|one.?time.?password|pin|password|passcode)\b/i,
      /\b(otp|pin|password|passcode).{0,40}(share|send|give|tell|provide)\b/i,
      /\bverification\s+code\b/i, /\bsecurity\s+code\b/i, /\bOTP\b/,
      /\bauthentication\s+code\b/i, /\bone.?time\s+(code|pin|password)\b/i,
      /\bsms\s+(code|otp|pin)\b/i,
      /\bரகசிய\s+எண்\b/, /\bகடவுச்சொல்\b/,
    ],
  },
  payment_demand: {
    label: 'Unusual Payment / Money Transfer', icon: '💸', weight: 2.5,
    description: 'Demands for immediate payment via unusual methods are fraud hallmarks.',
    patterns: [
      /\b(transfer|send|deposit|pay).{0,50}(money|funds?|amount|cash|rupees?|rs\.?|lakhs?)\b/i,
      /\bgift\s+card(s)?\b/i, /\bitunes?\s+card\b/i, /\bcrypto(currency)?\b/i,
      /\bbitcoin\b/i, /\bwire\s+transfer\b/i, /\bneft\b/i, /\brtgs\b/i, /\bimps\b/i,
      /\bprocessing\s+fee\b/i, /\bregistration\s+fee\b/i, /\bsecurity\s+deposit\b/i,
      /\bupi\s+(id|transfer|payment)\b/i, /\bpaytm\b/i, /\bphonepe\b/i, /\bgpay\b/i,
      /\bபணம்\s+அனுப்பு\b/, /\bபணம்\s+கட்டு\b/,
    ],
  },
  threats: {
    label: 'Threats / Intimidation / Arrest Claims', icon: '⚖️', weight: 3.0,
    description: 'Fake threats of arrest or legal action are used to panic victims.',
    patterns: [
      /\b(arrest|arrested|jail|prison|police|court|legal\s+action|lawsuit)\b/i,
      /\byour\s+(account|card)\s+(will\s+be\s+)?(blocked|suspended|frozen|closed)\b/i,
      /\bcriminal\s+(charges?|case|record)\b/i, /\bwarrant\b/i, /\bfine\s+of\b/i,
      /\bfir\s+(registered|filed|lodged)\b/i, /\bcyber\s+crime\s+(case|complaint)\b/i,
      /\bmoney\s+laundering\b/i, /\benforcement\s+directorate\b/i,
      /\byou\s+will\s+(be\s+)?(arrested|jailed|prosecuted)\b/i,
      /\bகைது\b/, /\bசிறை\b/, /\bவழக்கு\b/, /\bதண்டனை\b/,
    ],
  },
  secrecy: {
    label: 'Secrecy / Isolation Request', icon: '🤫', weight: 2.0,
    description: 'Asking victims to keep calls secret isolates them from help.',
    patterns: [
      /\bdon'?t\s+tell\b/i, /\bkeep\s+(this|it)\s+(secret|confidential|between\s+us)\b/i,
      /\bdon'?t\s+(inform|contact|call).{0,30}(family|wife|husband|parents?|police|bank)\b/i,
      /\bnobody\s+(should|must)\s+know\b/i, /\bstay\s+on\s+the\s+(line|call)\b/i,
      /\bdon'?t\s+hang\s+up\b/i, /\bthis\s+is\s+(strictly\s+)?confidential\b/i,
      /\bயாரிடமும்\s+சொல்லாதே\b/, /\bரகசியமாக\b/,
    ],
  },
  prize_impersonation: {
    label: 'Fake Prize / Lottery / Impersonation', icon: '🎭', weight: 2.0,
    description: 'Impersonating agencies or announcing fake prizes are classic tactics.',
    patterns: [
      /\b(won|win|winner|winning).{0,40}(prize|lottery|lucky\s+draw|reward|cash)\b/i,
      /\bcongratulations.{0,60}(selected|chosen|won|prize)\b/i,
      /\bkbc\b/i, /\b(rbi|sebi|trai|irdai|income\s+tax)\s+(officer|department|calling)\b/i,
      /\bcbi\s+officer\b/i, /\bgovernment\s+(scheme|grant|lottery)\b/i,
      /\bclaim\s+your\s+(prize|reward|winnings)\b/i,
      /\bமுதல்\s+பரிசு\b/, /\bலாட்டரி\b/,
    ],
  },
  bank_verification: {
    label: 'Suspicious Bank / KYC Verification', icon: '🏦', weight: 2.0,
    description: 'Fake KYC updates are used to steal banking credentials.',
    patterns: [
      /\b(verify|confirm|update).{0,40}(account|card|kyc|details?|information)\b/i,
      /\bkyc\s+(expired?|update|pending|incomplete)\b/i,
      /\bcard\s+(number|details?|cvv|expiry)\b/i,
      /\bnet\s+banking\s+(credentials?|password|login)\b/i,
      /\bdebit\s+card\s+(number|pin|details?)\b/i,
      /\baadhaar\s+(number|card|linked|otp)\b/i, /\bpan\s+(card|number)\b/i,
      /\bகணக்கு\s+விவரம்\b/, /\bவங்கி\s+விவரம்\b/,
    ],
  },
  remote_access: {
    label: 'Remote Access / Device Takeover', icon: '💻', weight: 2.5,
    description: 'Remote access tools give scammers complete control of your device.',
    patterns: [
      /\b(install|download).{0,40}(anydesk|teamviewer|quicksupport|remote|app)\b/i,
      /\bscreen\s+share\b/i, /\bremote\s+(access|control|desktop)\b/i,
      /\ballow\s+(me|us)\s+to\s+(access|control|view|connect)\b/i,
      /\bteamviewer\b/i, /\banydesk\b/i, /\bquicksupport\b/i,
      /\bரிமோட்\s+அணுகல்\b/,
    ],
  },
  caller_identity_fraud: {
    label: 'Fake Caller Identity / Authority', icon: '🎭', weight: 2.5,
    description: 'Scammers impersonate bank officials, police or government officers.',
    patterns: [
      /\b(calling|speaking)\s+from\s+(sbi|hdfc|icici|axis|kotak|rbi|sebi|trai)\b/i,
      /\bi\s+am\s+(a\s+)?(senior\s+)?(officer|official|manager|inspector|detective)\b/i,
      /\bthis\s+is\s+(a\s+)?(official|government|bank|police|cbi|trai|rbi)\s+(call|notice)\b/i,
      /\byour\s+(sim|mobile|number)\s+(will\s+be\s+)?(blocked|disconnected|deactivated)\b/i,
      /\btrai\s+(officer|department|notice)\b/i, /\bdot\s+(officer|department)\b/i,
    ],
  },
  personal_info_harvesting: {
    label: 'Personal Information Harvesting', icon: '🕵️', weight: 2.0,
    description: 'Collecting personal details builds a profile for identity theft.',
    patterns: [
      /\b(confirm|verify|provide|share).{0,30}(date\s+of\s+birth|dob|address|full\s+name)\b/i,
      /\baadhaar\s+(number|card|details?)\b/i, /\bpan\s+(number|card)\b/i,
      /\bpassport\s+(number|details?)\b/i, /\bvoter\s+id\b/i,
      /\bmother'?s\s+maiden\s+name\b/i, /\bdate\s+of\s+birth\b/i,
      /\bவீட்டு\s+முகவரி\b/, /\bஆதார்\s+எண்\b/,
    ],
  },
  emotional_manipulation: {
    label: 'Emotional Manipulation / Fear Tactics', icon: '😨', weight: 1.5,
    description: 'Creating fear overrides rational thinking and makes victims compliant.',
    patterns: [
      /\byour\s+(family|children|parents?|wife|husband)\s+(will\s+be\s+)?(affected|harmed|arrested)\b/i,
      /\bthis\s+is\s+(very\s+)?(serious|critical|dangerous|urgent)\b/i,
      /\byou\s+(are\s+in\s+)?(serious\s+)?(trouble|danger|problem)\b/i,
      /\bwe\s+are\s+trying\s+to\s+(help|save|protect)\s+you\b/i,
      /\bcooperate\s+(with\s+us|now|immediately)\b/i,
      /\bif\s+you\s+(don'?t|fail\s+to|refuse\s+to).{0,30}(pay|cooperate|comply)\b/i,
    ],
  },
  tech_support_scam: {
    label: 'Tech Support / Device Compromise', icon: '🖥️', weight: 2.0,
    description: 'Fake virus alerts trick users into paying for fake support.',
    patterns: [
      /\byour\s+(computer|phone|device|system)\s+(has\s+been\s+)?(hacked|compromised|infected|virus)\b/i,
      /\bvirus\s+(detected|found|alert)\b/i, /\bmalware\s+(detected|found)\b/i,
      /\bmicrosoft\s+(support|calling|alert)\b/i, /\bwindows\s+(support|alert|error)\b/i,
      /\bapple\s+(support|calling|alert)\b/i,
      /\btech(nical)?\s+support\s+(calling|team)\b/i,
      /\bwe\s+detected\s+(suspicious|unusual)\s+activity\b/i,
    ],
  },
};

const NEGATION = /\b(not|never|no|don'?t|didn'?t|won'?t|wouldn'?t|isn'?t|aren'?t|இல்லை|வேண்டாம்)\b/i;
const NEGATION_WINDOW = 60;

function isNegated(text, matchStart) {
  const start = Math.max(0, matchStart - NEGATION_WINDOW);
  return NEGATION.test(text.slice(start, matchStart));
}

export function detectScam(text) {
  if (!text || !text.trim()) return { matches: [], categoryHits: {}, score: 0, category: 'Low', icon: '🟢' };

  const matches = [];
  const categoryHits = {};

  for (const [catKey, catInfo] of Object.entries(CATEGORIES)) {
    const catMatches = [];
    for (const pattern of catInfo.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let m;
      while ((m = regex.exec(text)) !== null) {
        const negated = isNegated(text, m.index);
        catMatches.push({ category: catKey, phrase: m[0], index: m.index, negated });
      }
    }
    const active = catMatches.filter(m => !m.negated);
    if (active.length > 0) {
      categoryHits[catKey] = active.length;
      matches.push(...active);
    }
  }

  // Score
  let raw = 0;
  let highWeightHits = 0;
  for (const [catKey, hits] of Object.entries(categoryHits)) {
    const w = CATEGORIES[catKey].weight;
    raw += w * Math.log1p(hits) * 10;
    if (w >= 2.5) highWeightHits++;
  }
  if (highWeightHits >= 2) raw += 5 * highWeightHits;
  const score = Math.min(Math.floor(raw), 100);

  let category = 'Low', icon = '🟢';
  if (score >= 75) { category = 'Very High'; icon = '🔴'; }
  else if (score >= 50) { category = 'High'; icon = '🟠'; }
  else if (score >= 25) { category = 'Moderate'; icon = '🟡'; }

  return { matches, categoryHits, score, category, icon };
}

export const SCAM_PROFILES = [
  { name: 'Banking / OTP Fraud', icon: '🏦', required: ['otp_credentials','bank_verification'], stat: '95,000+ cases/year in India' },
  { name: 'Fake Arrest / CBI Scam', icon: '⚖️', required: ['threats','payment_demand'], stat: '₹1,200 Cr losses in 2023' },
  { name: 'Tech Support Scam', icon: '💻', required: ['tech_support_scam','remote_access'], stat: '6,000+ complaints/month globally' },
  { name: 'KBC / Lottery Scam', icon: '🎰', required: ['prize_impersonation','payment_demand'], stat: "India's most reported phone fraud" },
  { name: 'SIM / TRAI Fraud', icon: '📱', required: ['caller_identity_fraud','otp_credentials'], stat: '300% surge in 2023 per CERT-In' },
  { name: 'Identity Theft', icon: '🕵️', required: ['personal_info_harvesting','bank_verification'], stat: '14.02 lakh complaints in 2023' },
];

export function classifyScam(categoryHits) {
  const keys = Object.keys(categoryHits);
  for (const p of SCAM_PROFILES) {
    if (p.required.every(r => keys.includes(r))) return p;
  }
  // partial match
  let best = null, bestScore = 0;
  for (const p of SCAM_PROFILES) {
    const overlap = p.required.filter(r => keys.includes(r)).length;
    if (overlap > bestScore) { bestScore = overlap; best = p; }
  }
  return bestScore >= 1 ? best : null;
}

export const RECOMMENDATIONS = {
  otp_credentials:          { icon:'🔑', title:'Never Share OTP or Password', body:'No bank or government body will EVER ask for your OTP. Hang up immediately.' },
  payment_demand:           { icon:'💸', title:'Do Not Transfer Money Under Pressure', body:'Verify any payment request by calling the organization on their official number.' },
  threats:                  { icon:'⚖️', title:'Fake Arrest Threats Are Illegal', body:'Real police serve physical notices. Hang up and call your local police station.' },
  urgency:                  { icon:'⏱️', title:'Urgency Is a Manipulation Tool', body:'Any legitimate issue can wait 30 minutes for you to verify independently.' },
  secrecy:                  { icon:'🤫', title:'Secrecy Requests Are a Red Flag', body:'Tell a trusted family member immediately. Scammers rely on isolation.' },
  prize_impersonation:      { icon:'🎭', title:'Unsolicited Prizes Are Always Scams', body:'You cannot win a lottery you never entered. Verify on the official website.' },
  bank_verification:        { icon:'🏦', title:'Call Your Bank Directly', body:'Call the number on the back of your card — never the number the caller gave you.' },
  remote_access:            { icon:'💻', title:'Never Install Apps at Caller Request', body:'Uninstall AnyDesk/TeamViewer immediately and change all passwords.' },
  caller_identity_fraud:    { icon:'🎭', title:'Verify Caller Identity Independently', body:'TRAI, RBI and police do not call to block SIMs or demand payments.' },
  personal_info_harvesting: { icon:'🕵️', title:'Protect Your Personal Details', body:'Never share Aadhaar, PAN, or date of birth with an unsolicited caller.' },
  emotional_manipulation:   { icon:'😨', title:'Recognize Emotional Manipulation', body:'Take a breath, hang up, and talk to a trusted person before doing anything.' },
  tech_support_scam:        { icon:'🖥️', title:'Tech Companies Never Call Unsolicited', body:'Close any pop-up with a phone number. Run a legitimate antivirus scan.' },
};

export const EMERGENCY_CONTACTS = [
  { name: 'Cybercrime Helpline', number: '1930', available: '24/7', color: '#d50000' },
  { name: 'Police', number: '100', available: '24/7', color: '#d50000' },
  { name: 'RBI Ombudsman', number: '14448', available: 'Mon–Sat 9AM–5PM', color: '#ff6d00' },
  { name: 'TRAI', number: '1800-110-420', available: 'Mon–Fri 9AM–6PM', color: '#ffd600' },
];

export const BANK_HELPLINES = [
  { bank:'SBI',    number:'1800-11-2211' },
  { bank:'HDFC',   number:'1800-202-6161' },
  { bank:'ICICI',  number:'1800-1080' },
  { bank:'Axis',   number:'1800-419-5959' },
  { bank:'Kotak',  number:'1860-266-2666' },
  { bank:'PNB',    number:'1800-180-2222' },
];
