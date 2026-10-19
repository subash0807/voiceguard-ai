"""
app_cloud.py — VoiceGuard AI for Streamlit Community Cloud deployment.
Differences from app.py:
  - Uses AssemblyAI instead of Whisper (no torch/ffmpeg needed)
  - Uses st.session_state for history (no SQLite persistent disk)
  - Run: streamlit run app_cloud.py
"""
import json, os
from pathlib import Path
from datetime import datetime
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from analyzer.phrase_detector import CATEGORIES, detect, highlight_transcript
from analyzer.recommendations import generate_recommendations, BANK_HELPLINES, EMERGENCY_CONTACTS
from analyzer.risk_scorer import calculate_risk
from analyzer.transcription_cloud import MAX_FILE_SIZE_MB, SUPPORTED_FORMATS, save_upload_to_temp, transcribe

st.set_page_config(page_title="VoiceGuard AI", page_icon="🛡️", layout="wide", initial_sidebar_state="expanded")

# ── CSS (identical to app.py) ────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
html,body,[class*="css"]{font-family:'Inter',sans-serif;}
.hero{background:linear-gradient(135deg,#060d1a 0%,#0d1b2e 40%,#060d1a 100%);
  border:1px solid #1e3a5f;border-radius:20px;padding:2.5rem 3rem;margin-bottom:1.5rem;}
.hero-title{font-size:2.6rem;font-weight:800;
  background:linear-gradient(90deg,#58a6ff,#00c853,#58a6ff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 0.4rem;}
.hero-sub{color:#8b949e;font-size:1rem;margin:0;}
.hero-badge{display:inline-flex;align-items:center;gap:6px;
  background:rgba(0,200,83,0.12);color:#00c853;
  border:1px solid rgba(0,200,83,0.3);border-radius:20px;
  padding:3px 14px;font-size:0.72rem;font-weight:700;
  margin-bottom:1rem;letter-spacing:.08em;text-transform:uppercase;}
.hero-stats{display:flex;gap:2rem;margin-top:1.2rem;}
.hero-stat{text-align:center;}
.hero-stat-val{font-size:1.6rem;font-weight:700;color:#58a6ff;}
.hero-stat-lbl{font-size:0.7rem;color:#6e7681;text-transform:uppercase;letter-spacing:.06em;}
.risk-banner{border-radius:14px;padding:1.3rem 2rem;margin:1rem 0;
  font-size:1.4rem;font-weight:800;display:flex;align-items:center;gap:1rem;}
.risk-low     {background:linear-gradient(90deg,#071a0f,#0a2415);border-left:6px solid #00c853;color:#69f0ae;}
.risk-moderate{background:linear-gradient(90deg,#1a1500,#221c00);border-left:6px solid #ffd600;color:#fff176;}
.risk-high    {background:linear-gradient(90deg,#1a0a00,#221000);border-left:6px solid #ff6d00;color:#ffcc80;}
.risk-veryhigh{background:linear-gradient(90deg,#1a0000,#220000);border-left:6px solid #d50000;color:#ff8a80;}
.card{background:#0d1520;border:1px solid #1e3a5f;border-radius:14px;padding:1.3rem 1.6rem;margin-bottom:1rem;}
.card-title{font-size:1rem;font-weight:700;color:#e6edf3;margin-bottom:.4rem;}
.card-body{font-size:.88rem;color:#8b949e;line-height:1.7;}
.scam-card{background:linear-gradient(135deg,#0d1520,#111d2e);
  border:1px solid #1e3a5f;border-radius:14px;padding:1.4rem 1.8rem;margin:1rem 0;}
.scam-title{font-size:1.3rem;font-weight:800;color:#58a6ff;margin-bottom:.3rem;}
.scam-desc{color:#c9d1d9;font-size:.9rem;line-height:1.7;margin-bottom:.6rem;}
.scam-stat{background:rgba(255,109,0,.1);border:1px solid rgba(255,109,0,.3);
  border-radius:8px;padding:.5rem 1rem;font-size:.8rem;color:#ffcc80;}
.pill{display:inline-block;border-radius:20px;padding:2px 11px;
  font-size:.7rem;font-weight:700;margin-right:4px;letter-spacing:.03em;}
.pill-critical{background:rgba(213,0,0,.2);color:#ff8a80;border:1px solid rgba(213,0,0,.4);}
.pill-high    {background:rgba(255,109,0,.2);color:#ffcc80;border:1px solid rgba(255,109,0,.4);}
.pill-medium  {background:rgba(255,214,0,.2);color:#fff176;border:1px solid rgba(255,214,0,.4);}
.pill-low     {background:rgba(88,166,255,.2);color:#58a6ff;border:1px solid rgba(88,166,255,.4);}
.pill-green   {background:rgba(0,200,83,.2);color:#69f0ae;border:1px solid rgba(0,200,83,.4);}
.finding{background:#0a1220;border:1px solid #1e3a5f;border-radius:12px;
  padding:1.1rem 1.4rem;margin-bottom:.8rem;}
.finding-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem;}
.finding-title{font-weight:700;color:#e6edf3;font-size:.95rem;}
.finding-desc{font-size:.82rem;color:#6e7681;line-height:1.6;margin-bottom:.6rem;}
.tactic{display:flex;align-items:flex-start;gap:.8rem;padding:.6rem 0;
  border-bottom:1px solid #1e3a5f;}
.tactic:last-child{border-bottom:none;}
.tactic-dot{width:10px;height:10px;border-radius:50%;background:#58a6ff;margin-top:5px;flex-shrink:0;}
.tactic-text{font-size:.85rem;color:#c9d1d9;line-height:1.5;}
.rec{border-radius:10px;padding:.9rem 1.2rem;margin-bottom:.6rem;
  font-size:.88rem;color:#c9d1d9;line-height:1.7;}
.rec-urgent{background:#150505;border-left:4px solid #d50000;}
.rec-warn  {background:#0d1520;border-left:4px solid #ff6d00;}
.rec-info  {background:#0d1520;border-left:4px solid #58a6ff;}
.rec-title {font-weight:700;color:#e6edf3;margin-bottom:.3rem;}
.step{background:#0a1220;border:1px solid #1e3a5f;border-radius:10px;
  padding:.8rem 1.2rem;margin-bottom:.5rem;font-size:.88rem;color:#c9d1d9;}
.helpline{display:flex;justify-content:space-between;align-items:center;
  padding:.6rem .8rem;border-radius:8px;margin-bottom:.4rem;
  background:#0a1220;border:1px solid #1e3a5f;}
.helpline-name{font-weight:600;color:#e6edf3;font-size:.85rem;}
.helpline-num{font-size:.9rem;font-weight:700;color:#00c853;}
.emergency{background:linear-gradient(90deg,#150505,#1a0505);
  border:1px solid rgba(213,0,0,.4);border-radius:12px;padding:1rem 1.4rem;margin-bottom:.6rem;}
.emergency-name{font-weight:700;color:#ff8a80;font-size:.9rem;}
.emergency-num{font-size:1.4rem;font-weight:800;color:#ff4444;letter-spacing:.05em;}
.transcript{background:#060d1a;border:1px solid #1e3a5f;border-radius:12px;
  padding:1.4rem 1.8rem;font-size:.93rem;line-height:2;color:#c9d1d9;
  max-height:420px;overflow-y:auto;}
.disclaimer{font-size:.76rem;color:#6e7681;font-style:italic;
  padding:.5rem .9rem;background:#060d1a;border-radius:6px;
  border:1px solid #1e3a5f;margin-top:.5rem;}
.conf-high  {color:#69f0ae;font-weight:700;}
.conf-medium{color:#fff176;font-weight:700;}
.conf-low   {color:#ff8a80;font-weight:700;}
[data-testid="stSidebar"]{background:#060d1a;border-right:1px solid #1e3a5f;}
mark{background:linear-gradient(90deg,#7f1d1d,#b91c1c);color:white;
  padding:1px 6px;border-radius:4px;font-weight:700;}
</style>
""", unsafe_allow_html=True)

# ── Session-state history (replaces SQLite for cloud) ────────────────────────
if "history" not in st.session_state:
    st.session_state.history = []

def _save(filename, language, transcript, risk_score, risk_category, findings):
    st.session_state.history.insert(0, {
        "id": len(st.session_state.history) + 1,
        "created_at": datetime.utcnow().isoformat(timespec="seconds"),
        "filename": filename, "language": language, "transcript": transcript,
        "risk_score": risk_score, "risk_category": risk_category, "findings": findings,
    })

def _get_history():
    return st.session_state.history

def _delete_all():
    st.session_state.history = []

# ── Helpers ──────────────────────────────────────────────────────────────────
def _risk_css(cat):
    return {"Low":"risk-low","Moderate":"risk-moderate","High":"risk-high","Very High":"risk-veryhigh"}.get(cat,"risk-low")

def _pill(weight):
    if weight>=3.0: return '<span class="pill pill-critical">Critical</span>'
    if weight>=2.5: return '<span class="pill pill-high">High</span>'
    if weight>=2.0: return '<span class="pill pill-medium">Medium</span>'
    return '<span class="pill pill-low">Low</span>'

def _conf_html(c):
    cls = {"High":"conf-high","Medium":"conf-medium","Low":"conf-low"}.get(c,"conf-low")
    return f'<span class="{cls}">{c}</span>'

def _gauge(score, category):
    color = {"Low":"#00c853","Moderate":"#ffd600","High":"#ff6d00","Very High":"#d50000"}.get(category,"#00c853")
    fig = go.Figure(go.Indicator(
        mode="gauge+number", value=score,
        number={"font":{"size":52,"color":color},"suffix":"/100"},
        gauge={
            "axis":{"range":[0,100],"tickcolor":"#8b949e","tickfont":{"color":"#8b949e","size":10}},
            "bar":{"color":color,"thickness":0.28},
            "bgcolor":"#0d1520","bordercolor":"#1e3a5f",
            "steps":[
                {"range":[0,25],"color":"#071a0f"},{"range":[25,50],"color":"#1a1500"},
                {"range":[50,75],"color":"#1a0a00"},{"range":[75,100],"color":"#1a0000"},
            ],
            "threshold":{"line":{"color":color,"width":5},"thickness":0.85,"value":score},
        },
    ))
    fig.update_layout(height=270,margin=dict(t=20,b=10,l=20,r=20),
                      paper_bgcolor="#060d1a",font_color="#c9d1d9")
    return fig

def _bar_chart(findings):
    if not findings: return None
    labels = [f.label.split("/")[0].strip()[:22] for f in findings]
    values = [f.contribution for f in findings]
    colors = ["#d50000" if f.weight>=3 else "#ff6d00" if f.weight>=2.5 else "#ffd600" if f.weight>=2 else "#58a6ff" for f in findings]
    fig = go.Figure(go.Bar(
        x=values, y=labels, orientation="h",
        marker_color=colors,
        text=[f"+{v:.1f}" for v in values], textposition="outside",
        textfont={"color":"#8b949e","size":11},
    ))
    fig.update_layout(
        height=max(200,len(findings)*52), margin=dict(t=10,b=10,l=10,r=50),
        paper_bgcolor="#060d1a", plot_bgcolor="#060d1a",
        xaxis={"showgrid":False,"zeroline":False,"color":"#8b949e"},
        yaxis={"color":"#c9d1d9","autorange":"reversed"}, showlegend=False,
    )
    return fig

def _radar_chart(findings):
    if len(findings) < 3: return None
    cats = [f.label.split("/")[0].strip()[:18] for f in findings]
    vals = [min(f.contribution, 30) for f in findings]
    vals_c = vals + [vals[0]]; cats_c = cats + [cats[0]]
    fig = go.Figure(go.Scatterpolar(
        r=vals_c, theta=cats_c, fill="toself",
        fillcolor="rgba(88,166,255,0.1)",
        line={"color":"#58a6ff","width":2},
        marker={"color":"#58a6ff","size":6},
    ))
    fig.update_layout(
        polar={"bgcolor":"#0d1520",
               "radialaxis":{"visible":True,"color":"#6e7681","gridcolor":"#1e3a5f","range":[0,30]},
               "angularaxis":{"color":"#8b949e","gridcolor":"#1e3a5f"}},
        paper_bgcolor="#060d1a", height=300, margin=dict(t=20,b=20,l=20,r=20), showlegend=False,
    )
    return fig

def _run_analysis(transcript, filename, lang):
    detection = detect(transcript)
    report = calculate_risk(detection)
    recs = generate_recommendations(report)
    findings_for_db = [
        {"category":f.category_key,"label":f.label,"hits":f.hit_count,
         "contribution":f.contribution,"phrases":f.sample_phrases}
        for f in report.findings
    ]
    _save(filename, lang, transcript, report.score, report.category, findings_for_db)
    return detection, report, recs, findings_for_db

def _show_results(transcript, lang, detection, report, recs, findings_for_db, filename):
    css = _risk_css(report.category)
    st.markdown(
        f'<div class="risk-banner {css}">'
        f'{report.icon} Risk Score: {report.score}/100 &nbsp;—&nbsp; {report.category} Risk'
        f'&nbsp;&nbsp;<span style="font-size:.9rem;font-weight:400;opacity:.7">'
        f'Confidence: {_conf_html(report.confidence)}</span></div>',
        unsafe_allow_html=True,
    )
    st.markdown(f'<div class="disclaimer">{report.disclaimer}</div>', unsafe_allow_html=True)

    c1,c2,c3,c4,c5 = st.columns(5)
    c1.metric("Risk Score", f"{report.score}/100")
    c2.metric("Risk Level", report.category)
    c3.metric("Threat Categories", report.total_categories_hit)
    c4.metric("Language", lang.upper())
    c5.metric("Confidence", report.confidence)

    if report.scam_type:
        s = report.scam_type
        st.markdown(
            f'<div class="scam-card">'
            f'<div style="font-size:.72rem;color:#6e7681;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem">Identified Scam Type</div>'
            f'<div class="scam-title">{s["icon"]} {s["name"]}</div>'
            f'<div class="scam-desc">{s["description"]}</div>'
            f'<div class="scam-stat">📊 {s["real_cases"]}</div>'
            f'</div>', unsafe_allow_html=True,
        )

    st.divider()
    gcol, bcol, rcol = st.columns([1,1,1])
    with gcol:
        st.markdown('<div style="color:#8b949e;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Risk Gauge</div>', unsafe_allow_html=True)
        st.plotly_chart(_gauge(report.score, report.category), use_container_width=True, config={"displayModeBar":False})
    with bcol:
        st.markdown('<div style="color:#8b949e;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Score Breakdown</div>', unsafe_allow_html=True)
        fig = _bar_chart(report.findings)
        if fig: st.plotly_chart(fig, use_container_width=True, config={"displayModeBar":False})
        else: st.info("No threats detected.")
    with rcol:
        st.markdown('<div style="color:#8b949e;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Threat Radar</div>', unsafe_allow_html=True)
        rfig = _radar_chart(report.findings)
        if rfig: st.plotly_chart(rfig, use_container_width=True, config={"displayModeBar":False})
        elif report.findings: st.info("Need 3+ categories for radar.")

    if report.manipulation_tactics:
        st.markdown('<div style="color:#8b949e;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin:1rem 0 .5rem">Manipulation Tactics Detected</div>', unsafe_allow_html=True)
        html = '<div class="card">'
        for t in report.manipulation_tactics:
            html += f'<div class="tactic"><div class="tactic-dot"></div><div class="tactic-text">{t}</div></div>'
        html += '</div>'
        st.markdown(html, unsafe_allow_html=True)

    st.divider()
    tab1,tab2,tab3,tab4,tab5 = st.tabs(["📝 Transcript","⚠️ Findings","🛡️ Action Plan","📞 Helplines","📤 Export"])

    with tab1:
        st.markdown(f'<div style="color:#6e7681;font-size:.8rem;margin-bottom:.6rem">Detected language: <b style="color:#58a6ff">{lang}</b> &nbsp;|&nbsp; Flagged phrases: <b style="color:#ff8a80">{len([m for m in detection.matches if not m.negated])}</b></div>', unsafe_allow_html=True)
        if detection.matches:
            st.markdown(f'<div class="transcript">{highlight_transcript(transcript, detection.matches)}</div>', unsafe_allow_html=True)
        else:
            st.markdown(f'<div class="transcript">{transcript}</div>', unsafe_allow_html=True)

    with tab2:
        if not report.findings:
            st.success("✅ No suspicious indicators detected.")
        else:
            for f in report.findings:
                st.markdown(
                    f'<div class="finding"><div class="finding-header">'
                    f'<span class="finding-title">{f.icon} {f.label}</span>'
                    f'<span>{_pill(f.weight)}'
                    f'<span class="pill pill-low">{f.hit_count} hit{"s" if f.hit_count>1 else ""}</span>'
                    f'<span style="color:#6e7681;font-size:.78rem;margin-left:6px">+{f.contribution} pts</span></span>'
                    f'</div><div class="finding-desc">{f.description}</div>',
                    unsafe_allow_html=True,
                )
                for p in f.sample_phrases: st.code(p, language=None)
                st.markdown('</div>', unsafe_allow_html=True)

    with tab3:
        if recs.high_risk:
            st.markdown('<div style="font-weight:700;color:#ff8a80;font-size:1rem;margin-bottom:.6rem">🚨 IMMEDIATE ACTIONS REQUIRED</div>', unsafe_allow_html=True)
            for r in recs.high_risk:
                st.markdown(f'<div class="rec rec-urgent">{r}</div>', unsafe_allow_html=True)
            st.divider()
        st.markdown('<div style="font-weight:700;color:#e6edf3;margin-bottom:.6rem">📋 Step-by-Step Action Plan</div>', unsafe_allow_html=True)
        for step in recs.action_steps:
            st.markdown(f'<div class="step">{step}</div>', unsafe_allow_html=True)
        if recs.specific:
            st.divider()
            st.markdown('<div style="font-weight:700;color:#e6edf3;margin-bottom:.6rem">🎯 Specific Advice for Detected Threats</div>', unsafe_allow_html=True)
            for r in recs.specific:
                st.markdown(f'<div class="rec rec-warn"><div class="rec-title">{r["icon"]} {r["title"]}</div>{r["body"]}</div>', unsafe_allow_html=True)
        st.divider()
        st.markdown('<div style="font-weight:700;color:#e6edf3;margin-bottom:.6rem">💡 General Safety Rules</div>', unsafe_allow_html=True)
        for r in recs.general:
            st.markdown(f'<div class="rec rec-info">{r["icon"]} {r["text"]}</div>', unsafe_allow_html=True)

    with tab4:
        col_e, col_b = st.columns(2)
        with col_e:
            st.markdown('<div style="font-weight:700;color:#ff8a80;margin-bottom:.8rem">🚨 Emergency Contacts</div>', unsafe_allow_html=True)
            for e in recs.emergency_contacts:
                st.markdown(f'<div class="emergency"><div class="emergency-name">{e["name"]}</div><div class="emergency-num">{e["number"]}</div><div style="font-size:.72rem;color:#6e7681">{e["available"]}</div></div>', unsafe_allow_html=True)
        with col_b:
            st.markdown('<div style="font-weight:700;color:#58a6ff;margin-bottom:.8rem">🏦 Bank Fraud Helplines</div>', unsafe_allow_html=True)
            for b in recs.bank_helplines:
                st.markdown(f'<div class="helpline"><span class="helpline-name">{b["bank"]}</span><span class="helpline-num">{b["fraud"]}</span></div>', unsafe_allow_html=True)

    with tab5:
        export_data = {
            "filename":filename,"language":lang,"transcript":transcript,
            "risk_score":report.score,"risk_category":report.category,
            "confidence":report.confidence,
            "scam_type":report.scam_type["name"] if report.scam_type else "Unknown",
            "manipulation_tactics":report.manipulation_tactics,
            "findings":findings_for_db,
            "action_steps":recs.action_steps,
        }
        stem = Path(filename).stem
        cj,cc = st.columns(2)
        with cj:
            st.download_button("⬇️ Download JSON Report",
                data=json.dumps(export_data,indent=2,ensure_ascii=False),
                file_name=f"voiceguard_{stem}.json", mime="application/json", use_container_width=True)
        with cc:
            if findings_for_db:
                st.download_button("⬇️ Download CSV Findings",
                    data=pd.DataFrame(findings_for_db).to_csv(index=False),
                    file_name=f"voiceguard_{stem}.csv", mime="text/csv", use_container_width=True)

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="text-align:center;padding:1.2rem 0 .8rem">
      <div style="font-size:3rem">🛡️</div>
      <div style="font-size:1.15rem;font-weight:800;background:linear-gradient(90deg,#58a6ff,#00c853);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">VoiceGuard AI</div>
      <div style="font-size:.72rem;color:#6e7681;letter-spacing:.08em;text-transform:uppercase">Scam Detection Engine</div>
    </div>""", unsafe_allow_html=True)
    st.divider()

    history = _get_history()
    total = len(history)
    avg_score = round(sum(r["risk_score"] for r in history)/total,1) if total else 0
    high_risk_count = sum(1 for r in history if r["risk_category"] in ("High","Very High"))
    safe_count = sum(1 for r in history if r["risk_category"] == "Low")

    st.markdown("**📊 Session Stats**")
    s1,s2 = st.columns(2)
    s1.metric("Total Scans", total)
    s2.metric("Avg Score", avg_score)
    s3,s4 = st.columns(2)
    s3.metric("🔴 High Risk", high_risk_count)
    s4.metric("🟢 Safe", safe_count)
    st.divider()

    lang_opts = {"Auto-detect":None,"English":"en","Tamil":"ta"}
    lang_choice = st.selectbox("🌐 Transcription Language", list(lang_opts.keys()))
    selected_lang = lang_opts[lang_choice]
    st.divider()

    page = st.radio("Navigate", ["🎙️ Analyze Audio","📝 Analyze Text","📊 Statistics","📋 History"])
    st.divider()

    st.markdown("""
    <div style="font-size:.73rem;color:#6e7681;line-height:1.8">
    🔒 <b style="color:#8b949e">Privacy First</b><br>
    • Audio never stored permanently<br>
    • Processed via AssemblyAI API<br>
    • No audio retained after analysis<br>
    • History lives in session only
    </div>""", unsafe_allow_html=True)

# ── India stats data ──────────────────────────────────────────────────────────
INDIA_STATS = {
    "total_complaints_2023": "14.02 Lakh",
    "financial_loss_2023": "₹7,488 Crore",
    "top_scam_types": [
        {"type":"Banking/OTP Fraud","pct":32,"color":"#d50000"},
        {"type":"Fake Arrest/CBI","pct":18,"color":"#ff6d00"},
        {"type":"KYC/Account Fraud","pct":15,"color":"#ffd600"},
        {"type":"Tech Support","pct":12,"color":"#58a6ff"},
        {"type":"Lottery/Prize","pct":10,"color":"#00c853"},
        {"type":"Others","pct":13,"color":"#6e7681"},
    ],
    "most_targeted": ["Senior citizens (60+)","Rural residents","First-time smartphone users","Job seekers"],
    "peak_hours": "10 AM – 2 PM and 6 PM – 9 PM",
    "avg_loss_per_victim": "₹1.5 Lakh",
    "recovery_rate": "Only 25% of reported cases see any recovery",
}

# ===========================================================================
# PAGE 1 — Analyze Audio
# ===========================================================================
if page == "🎙️ Analyze Audio":
    history_all = _get_history()
    total_s = len(history_all)
    high_s = sum(1 for r in history_all if r["risk_category"] in ("High","Very High"))

    st.markdown(f"""
    <div class="hero">
      <div class="hero-badge">🛡️ AI-Powered • AssemblyAI • Private</div>
      <div class="hero-title">VoiceGuard AI</div>
      <div class="hero-sub">Upload a call recording to detect scams, manipulation tactics, and fraud indicators.</div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-val">{total_s}</div><div class="hero-stat-lbl">Scans Done</div></div>
        <div class="hero-stat"><div class="hero-stat-val">{high_s}</div><div class="hero-stat-lbl">High Risk Found</div></div>
        <div class="hero-stat"><div class="hero-stat-val">12</div><div class="hero-stat-lbl">Threat Categories</div></div>
        <div class="hero-stat"><div class="hero-stat-val">150+</div><div class="hero-stat-lbl">Patterns</div></div>
      </div>
    </div>""", unsafe_allow_html=True)

    st.markdown(f'<div style="color:#6e7681;font-size:.82rem;margin-bottom:.8rem">Supported: {", ".join(sorted(SUPPORTED_FORMATS))} &nbsp;|&nbsp; Max: {MAX_FILE_SIZE_MB} MB</div>', unsafe_allow_html=True)

    uploaded = st.file_uploader("Drop audio file", type=[f.lstrip(".") for f in SUPPORTED_FORMATS], label_visibility="collapsed")

    if uploaded:
        st.audio(uploaded)
        uploaded.seek(0)
        size_mb = len(uploaded.getvalue())/(1024*1024)
        if size_mb > MAX_FILE_SIZE_MB:
            st.error(f"File too large ({size_mb:.1f} MB). Max is {MAX_FILE_SIZE_MB} MB.")
            st.stop()
        st.markdown(f'<div style="color:#6e7681;font-size:.8rem;margin:.3rem 0 .8rem">📁 {uploaded.name} &nbsp;|&nbsp; {size_mb:.2f} MB</div>', unsafe_allow_html=True)

        if st.button("🔍 Analyze Recording", type="primary", use_container_width=True):
            tmp_path = None
            try:
                with st.spinner("Saving audio…"):
                    uploaded.seek(0)
                    tmp_path = save_upload_to_temp(uploaded)
                with st.spinner("🎙️ Transcribing with AssemblyAI…"):
                    result = transcribe(tmp_path, language=selected_lang)
                if result["error"]:
                    st.error(f"Transcription error: {result['error']}")
                    st.stop()
                transcript = result["text"]
                detected_lang = result["language"]
                if not transcript.strip():
                    st.warning("No speech detected. Try a clearer recording.")
                    st.stop()
                with st.spinner("🔎 Analyzing for threats…"):
                    detection, report, recs, findings_for_db = _run_analysis(transcript, uploaded.name, detected_lang)
                _show_results(transcript, detected_lang, detection, report, recs, findings_for_db, uploaded.name)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)

# ===========================================================================
# PAGE 2 — Analyze Text
# ===========================================================================
elif page == "📝 Analyze Text":
    st.markdown("""
    <div class="hero">
      <div class="hero-badge">📝 Text Mode — No Audio Needed</div>
      <div class="hero-title">Analyze Transcript</div>
      <div class="hero-sub">Paste any call transcript, SMS, or WhatsApp message to instantly detect scam patterns.</div>
    </div>""", unsafe_allow_html=True)

    samples = {
        "— choose a sample —": "",
        "🚨 OTP + Bank Scam": "Hello, I am calling from SBI Bank fraud department. Your account has been flagged for suspicious activity and will be blocked within 30 minutes. You must share your OTP immediately to verify your identity. Please do not tell anyone about this call. Stay on the line and cooperate with us.",
        "⚖️ CBI Arrest Threat": "This is a CBI officer calling. A criminal case and FIR has been registered against your Aadhaar number for money laundering. You will be arrested unless you pay a fine of Rs. 50,000 immediately via UPI. Transfer the money to this account number right now. Do not contact your family.",
        "🎰 KBC Lottery Scam": "Congratulations! Your mobile number has been selected as the winner of KBC lucky draw. You have won a prize of 25 lakh rupees. To claim your reward, please provide your account details and pay a processing fee of Rs. 5,000. This offer expires today.",
        "💻 Tech Support Scam": "This is Microsoft support calling. Your computer has been hacked and we detected a virus on your system. Your IP address has been flagged. Please install AnyDesk immediately so our technician can access your device and fix the issue. Your data is at risk.",
        "📱 TRAI SIM Block": "This is a TRAI officer calling. Your mobile number is linked to illegal activities and will be disconnected within 2 hours. To avoid disconnection, verify your Aadhaar number and share the OTP you receive. This is urgent — act now.",
        "✅ Normal Call": "Hi, this is Priya calling from the customer support team. I wanted to check if you received the package we sent last week. There is no urgency — please let us know at your convenience if you need any help.",
    }

    col_s, col_l = st.columns([2,1])
    with col_s:
        sample_choice = st.selectbox("Load a sample", list(samples.keys()))
    with col_l:
        lang_text = st.selectbox("Language", ["en","ta","mixed"],
            format_func=lambda x: {"en":"English","ta":"Tamil","mixed":"Mixed"}[x])

    text_input = st.text_area("Paste transcript here", value=samples[sample_choice],
        height=200, placeholder="Paste a call transcript, SMS, or suspicious message…")

    if st.button("🔎 Analyze Text", type="primary", use_container_width=True):
        if not text_input.strip():
            st.warning("Please enter some text.")
        else:
            with st.spinner("Analyzing…"):
                detection, report, recs, findings_for_db = _run_analysis(text_input.strip(), "text_input.txt", lang_text)
            _show_results(text_input.strip(), lang_text, detection, report, recs, findings_for_db, "text_input.txt")

# ===========================================================================
# PAGE 3 — Statistics
# ===========================================================================
elif page == "📊 Statistics":
    st.markdown("""
    <div class="hero">
      <div class="hero-badge">📊 India Cybercrime Intelligence</div>
      <div class="hero-title">Voice Scam Statistics</div>
      <div class="hero-sub">Real data on voice scams in India — know what you're up against.</div>
    </div>""", unsafe_allow_html=True)

    s = INDIA_STATS
    c1,c2,c3,c4 = st.columns(4)
    c1.markdown(f'<div class="card"><div class="card-title">📋 Total Complaints 2023</div><div style="font-size:1.8rem;font-weight:800;color:#58a6ff">{s["total_complaints_2023"]}</div><div class="card-body">Reported to NCRB</div></div>', unsafe_allow_html=True)
    c2.markdown(f'<div class="card"><div class="card-title">💸 Financial Losses 2023</div><div style="font-size:1.8rem;font-weight:800;color:#ff8a80">{s["financial_loss_2023"]}</div><div class="card-body">Total reported losses</div></div>', unsafe_allow_html=True)
    c3.markdown(f'<div class="card"><div class="card-title">👤 Avg Loss Per Victim</div><div style="font-size:1.8rem;font-weight:800;color:#ffcc80">{s["avg_loss_per_victim"]}</div><div class="card-body">Per reported case</div></div>', unsafe_allow_html=True)
    c4.markdown(f'<div class="card"><div class="card-title">🔄 Recovery Rate</div><div style="font-size:1.8rem;font-weight:800;color:#fff176">25%</div><div class="card-body">{s["recovery_rate"]}</div></div>', unsafe_allow_html=True)

    st.divider()
    col_pie, col_info = st.columns([1,1])
    with col_pie:
        st.markdown("**Top Scam Types in India (2023)**")
        fig = go.Figure(go.Pie(
            labels=[t["type"] for t in s["top_scam_types"]],
            values=[t["pct"] for t in s["top_scam_types"]],
            marker_colors=[t["color"] for t in s["top_scam_types"]],
            hole=0.5, textinfo="label+percent",
            textfont={"color":"#c9d1d9","size":11},
        ))
        fig.update_layout(height=340, paper_bgcolor="#060d1a",
            legend={"font":{"color":"#8b949e"}}, margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar":False})
    with col_info:
        st.markdown("**Most Targeted Groups**")
        for g in s["most_targeted"]:
            st.markdown(f'<div class="step">⚠️ {g}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="card" style="margin-top:.8rem"><div class="card-title">⏰ Peak Scam Hours</div><div style="font-size:1.1rem;font-weight:700;color:#ffd600">{s["peak_hours"]}</div><div class="card-body">Be extra cautious during these hours</div></div>', unsafe_allow_html=True)

    st.divider()
    st.markdown("**How VoiceGuard Detects Each Scam Type**")
    cols = st.columns(3)
    for i, (cat_key, cat_info) in enumerate(CATEGORIES.items()):
        with cols[i % 3]:
            weight = cat_info["weight"]
            pill_cls = "pill-critical" if weight>=3 else "pill-high" if weight>=2.5 else "pill-medium" if weight>=2 else "pill-low"
            severity = "Critical" if weight>=3 else "High" if weight>=2.5 else "Medium" if weight>=2 else "Low"
            st.markdown(
                f'<div class="card">'
                f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">'
                f'<span style="font-size:1.1rem">{cat_info["icon"]}</span>'
                f'<span class="pill {pill_cls}">{severity}</span></div>'
                f'<div class="card-title">{cat_info["label"]}</div>'
                f'<div class="card-body">{cat_info["description"]}</div>'
                f'<div style="font-size:.72rem;color:#6e7681;margin-top:.5rem">{len(cat_info["patterns"])} patterns</div>'
                f'</div>', unsafe_allow_html=True,
            )

# ===========================================================================
# PAGE 4 — History
# ===========================================================================
elif page == "📋 History":
    st.markdown("""
    <div class="hero">
      <div class="hero-badge">📋 Session History</div>
      <div class="hero-title">Analysis History</div>
      <div class="hero-sub">History is stored for this session only. Audio files are never saved.</div>
    </div>""", unsafe_allow_html=True)

    history = _get_history()
    if not history:
        st.info("No analyses yet. Run your first analysis to see results here.")
    else:
        df = pd.DataFrame([{
            "ID": r["id"], "Date (UTC)": r["created_at"], "File": r["filename"],
            "Language": r["language"], "Score": r["risk_score"], "Category": r["risk_category"],
        } for r in history])

        def _color_cat(val):
            return {"Low":"color:#69f0ae","Moderate":"color:#fff176",
                    "High":"color:#ffcc80","Very High":"color:#ff8a80"}.get(val,"")

        st.dataframe(df.style.applymap(_color_cat, subset=["Category"]),
                     use_container_width=True, height=300)

        if len(history) >= 2:
            st.markdown("**Risk Score Trend**")
            tdf = pd.DataFrame([{"created_at":r["created_at"],"risk_score":r["risk_score"]} for r in reversed(history)])
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=tdf["created_at"], y=tdf["risk_score"],
                mode="lines+markers",
                line={"color":"#58a6ff","width":2},
                marker={"size":8,"color":tdf["risk_score"],
                        "colorscale":[[0,"#00c853"],[0.25,"#ffd600"],[0.5,"#ff6d00"],[1,"#d50000"]],
                        "cmin":0,"cmax":100},
                fill="tozeroy", fillcolor="rgba(88,166,255,0.05)",
            ))
            fig.update_layout(height=220, margin=dict(t=10,b=10,l=10,r=10),
                paper_bgcolor="#060d1a", plot_bgcolor="#060d1a",
                xaxis={"color":"#8b949e","showgrid":False},
                yaxis={"color":"#8b949e","range":[0,105],"showgrid":True,"gridcolor":"#1e3a5f"})
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar":False})

        st.divider()
        if st.button("🗑️ Clear Session History", use_container_width=True):
            _delete_all()
            st.success("Session history cleared.")
            st.rerun()
