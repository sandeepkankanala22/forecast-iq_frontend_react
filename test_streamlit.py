"""
Forecast_integrated_chat_streamlit.py
--------------------------------------
Streamlit version of the Commercial Forecast Tool + AI Copilot Chat.
Replicates all features of forecast_server.py + Forecast_Integrated_Chat.html.

Usage:
    streamlit run Forecast_integrated_chat_streamlit.py

Environment variables (.env or shell):
    OPENAI_API_KEY=sk-...
    OPENAI_MODEL=gpt-4o-mini   # optional, default: gpt-4o-mini
"""

import json
import math
import os
import re
import time
from io import StringIO

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent / ".env")

# ══════════════════════════════════════════════════════════════════════════════
# PAGE CONFIG  (must be first Streamlit call)
# ══════════════════════════════════════════════════════════════════════════════
st.set_page_config(
    page_title="Commercial Forecast Tool – AI Agent",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── inject compact CSS ──────────────────────────────────────────────────────
st.markdown("""
<style>
/* hide default streamlit header spacing */
.block-container { padding-top: 1rem; padding-bottom: 0.5rem; }
/* chat bubble styling */
.user-bubble { background:#21808d; color:#fff; border-radius:12px 12px 2px 12px;
               padding:10px 14px; margin:4px 0; max-width:88%; align-self:flex-end; font-size:13px; }
.bot-bubble  { background:#f8fafc; color:#0f2832; border:1px solid rgba(0,0,0,.07);
               border-radius:12px 12px 12px 2px; padding:10px 14px; margin:4px 0;
               max-width:88%; align-self:flex-start; font-size:13px; line-height:1.55; }
/* slim number inputs */
div[data-testid="stNumberInput"] input { padding: 4px 8px; }
/* step badge */
.step-badge { background:#21808d; color:#fff; border-radius:50%; width:26px; height:26px;
              display:inline-flex; align-items:center; justify-content:center;
              font-size:12px; font-weight:700; margin-right:8px; }
/* section card */
.fc-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px;
           padding:20px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
/* flow step */
.flow-step { display:inline-flex; align-items:center; padding:5px 11px; background:#21808d;
             color:#fff; border-radius:6px; font-size:11px; font-weight:600; }
.flow-arrow { font-size:15px; color:#777; margin:0 3px; }
/* engine step */
.eng-pending { color:#999; }
.eng-running { color:#21808d; font-weight:600; }
.eng-done    { color:#16a34a; font-weight:600; }
/* insight card */
.insight-card { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:12px;
                padding:14px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
.insight-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px;
                 color:#626c71; margin-bottom:5px; }
.insight-value { font-size:24px; font-weight:800; color:#0f2832; }
.insight-sub   { font-size:12px; color:#626c71; }
/* ai banner */
.ai-banner { background:linear-gradient(135deg,rgba(37,99,235,.06) 0%,rgba(33,128,141,.05) 100%);
             border:1px solid rgba(37,99,235,.2); border-radius:8px; padding:12px 14px;
             font-size:12px; line-height:1.55; margin-bottom:10px; }
/* validation */
.val-ok   { color:#16a34a; font-size:11px; }
.val-warn { color:#d97706; font-size:11px; }
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS & STATIC DATA
# ══════════════════════════════════════════════════════════════════════════════
COUNTRIES = [
    'United States', 'Germany', 'United Kingdom', 'France',
    'Japan', 'China', 'Canada', 'Italy', 'Spain',
]
INDICATIONS = [
    'Rheumatoid Arthritis', 'Multiple Sclerosis', 'Type 2 Diabetes',
    'Oncology', 'Alzheimer Disease', 'Heart Failure',
]
POPULATION_DATA = {
    'United States': 335_000_000, 'Germany': 84_000_000,
    'United Kingdom': 68_000_000, 'France': 68_000_000,
    'Japan': 125_000_000, 'China': 1_425_000_000,
    'Canada': 39_000_000, 'Italy': 59_000_000, 'Spain': 48_000_000,
}
DISCOUNT_RATES = {
    'United States': {'base': 0.22, 'range': '15-30%'},
    'Germany':        {'base': 0.18, 'range': '12-25%'},
    'United Kingdom': {'base': 0.20, 'range': '15-28%'},
    'France':         {'base': 0.19, 'range': '14-26%'},
    'Japan':          {'base': 0.12, 'range': '8-18%'},
    'China':          {'base': 0.25, 'range': '18-35%'},
    'Canada':         {'base': 0.21, 'range': '16-28%'},
    'Italy':          {'base': 0.17, 'range': '12-24%'},
    'Spain':          {'base': 0.16, 'range': '11-23%'},
}
EPIDEMIOLOGY_DEFAULTS = {
    'Rheumatoid Arthritis': {'prevalence': 0.005,  'diagnosis': 0.75, 'treatment': 0.70, 'biomarker': 0.80},
    'Multiple Sclerosis':   {'prevalence': 0.0025, 'diagnosis': 0.85, 'treatment': 0.80, 'biomarker': 0.90},
    'Type 2 Diabetes':      {'prevalence': 0.095,  'diagnosis': 0.70, 'treatment': 0.65, 'biomarker': 0.85},
    'Oncology':             {'prevalence': 0.0045, 'diagnosis': 0.90, 'treatment': 0.75, 'biomarker': 0.70},
    'Alzheimer Disease':    {'prevalence': 0.011,  'diagnosis': 0.65, 'treatment': 0.50, 'biomarker': 0.60},
    'Heart Failure':        {'prevalence': 0.020,  'diagnosis': 0.80, 'treatment': 0.70, 'biomarker': 0.75},
    'Default':              {'prevalence': 0.005,  'diagnosis': 0.75, 'treatment': 0.70, 'biomarker': 0.80},
}
RESEARCH_DB = {
    'Rheumatoid Arthritis': {
        'prevalence': 0.0055, 'prevalenceRationale': 'RA prevalence 0.55% per EULAR 2023 registry.',
        'diagnosis': 0.78, 'diagnosisRationale': 'Diagnosis rate 78% per ACR registry.',
        'treatment': 0.72, 'treatmentRationale': 'Treatment rate 72% per EULAR guidelines.',
        'biomarker': 0.82, 'biomarkerRationale': '82% eligibility (moderate-severe, DMARD-inadequate).',
        'classShare': 0.38, 'classShareRationale': '38% peak share in RA biologics.',
        'productShare': 0.27, 'productShareRationale': '27% vs recent RA biologic launches.',
        'annualCost': 68000, 'costRationale': '$68K benchmark for RA biologics.',
        'discountRationale': 'Net pricing after mandatory rebates and PBM negotiations.',
    },
    'Multiple Sclerosis': {
        'prevalence': 0.0028, 'prevalenceRationale': 'MS prevalence 0.28% per MSIF Atlas 2023.',
        'diagnosis': 0.87, 'diagnosisRationale': 'Diagnosis rate 87% with McDonald criteria.',
        'treatment': 0.81, 'treatmentRationale': 'Treatment rate 81% per MS registries.',
        'biomarker': 0.88, 'biomarkerRationale': '88% eligibility: RRMS, prior DMT failure.',
        'classShare': 0.42, 'classShareRationale': '42% share in MS DMT market.',
        'productShare': 0.29, 'productShareRationale': '29% share benchmarking recent MS launches.',
        'annualCost': 88000, 'costRationale': '$88K per high-efficacy MS pricing.',
        'discountRationale': 'Specialty pharmacy rebates and payer negotiations.',
    },
    'Type 2 Diabetes': {
        'prevalence': 0.098, 'prevalenceRationale': 'T2D prevalence 9.8% per IDF 2023.',
        'diagnosis': 0.71, 'diagnosisRationale': 'Diagnosis rate 71%, significant undiagnosed burden.',
        'treatment': 0.68, 'treatmentRationale': 'Treatment rate 68% per claims data.',
        'biomarker': 0.75, 'biomarkerRationale': '75% eligibility on background metformin.',
        'classShare': 0.31, 'classShareRationale': '31% in advanced T2D market.',
        'productShare': 0.23, 'productShareRationale': 'Conservative 23% in competitive diabetes market.',
        'annualCost': 12500, 'costRationale': '$12.5K for advanced diabetes therapy.',
        'discountRationale': 'High discount ~25-35% due to PBM negotiations.',
    },
    'Oncology': {
        'prevalence': 0.0048, 'prevalenceRationale': 'Cancer prevalence 0.48% per GLOBOCAN 2023.',
        'diagnosis': 0.92, 'diagnosisRationale': 'Diagnosis rate 92% given symptomatic presentation.',
        'treatment': 0.77, 'treatmentRationale': 'Treatment rate 77% for eligible patients.',
        'biomarker': 0.68, 'biomarkerRationale': '68% biomarker positive rate.',
        'classShare': 0.44, 'classShareRationale': '44% in target cancer segment.',
        'productShare': 0.31, 'productShareRationale': '31% benchmarking recent IO launches.',
        'annualCost': 185000, 'costRationale': '$185K per oncology pricing.',
        'discountRationale': 'Oncology discounts 15-22% vs primary care.',
    },
    'Alzheimer Disease': {
        'prevalence': 0.0115, 'prevalenceRationale': "AD prevalence 1.15% per Alzheimer's Association 2024.",
        'diagnosis': 0.67, 'diagnosisRationale': 'Diagnosis rate 67%, significant underdiagnosis.',
        'treatment': 0.52, 'treatmentRationale': 'Treatment rate 52%, limited DMT options historically.',
        'biomarker': 0.61, 'biomarkerRationale': '61% amyloid-positive eligible patients.',
        'classShare': 0.33, 'classShareRationale': '33% in AD DMT market.',
        'productShare': 0.22, 'productShareRationale': 'Conservative 22% given early market signals.',
        'annualCost': 26500, 'costRationale': '$26.5K aligned to DMT pricing.',
        'discountRationale': 'Medicare Part B and supplemental insurance discounts.',
    },
    'Heart Failure': {
        'prevalence': 0.0215, 'prevalenceRationale': 'HF prevalence 2.15% per AHA 2024.',
        'diagnosis': 0.81, 'diagnosisRationale': 'Diagnosis rate 81% via BNP and echo.',
        'treatment': 0.71, 'treatmentRationale': 'Treatment rate 71%, GDMT gaps persist.',
        'biomarker': 0.76, 'biomarkerRationale': '76% HFrEF eligible per PARADIGM-HF criteria.',
        'classShare': 0.41, 'classShareRationale': '41% in HFrEF market.',
        'productShare': 0.28, 'productShareRationale': '28% benchmarking Entresto/SGLT2i.',
        'annualCost': 5400, 'costRationale': '$5.4K aligned to HF therapy pricing.',
        'discountRationale': 'Primary care channel with aggressive PBM discounts.',
    },
}
PARAMETER_LABELS = {
    'population': 'Total Population', 'prevalence': 'Prevalence Rate',
    'incidence': 'Incidence Rate', 'severity': 'Severity / Subtype %',
    'diagnosisRate': 'Diagnosis Rate', 'treatmentRate': 'Treatment Rate',
    'eligibilityCriteria': 'Eligibility Criteria', 'progressionRate': 'Progression Rate',
    'classShare': 'Peak Class Share', 'peakProductShare': 'Peak Product Share',
    'annualCostPerPatient': 'Annual Cost per Patient', 'discount': 'Discount/Rebate Rate',
    'adoptionPeakTime': 'Time to Peak (Years)',
}
PRESETS = {
    'Standard Pharma Launch': ['population', 'prevalence', 'diagnosisRate', 'treatmentRate',
                               'eligibilityCriteria', 'classShare', 'peakProductShare',
                               'annualCostPerPatient', 'discount'],
    'Rare Disease':           ['population', 'prevalence', 'diagnosisRate', 'eligibilityCriteria',
                               'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount'],
    'Oncology':               ['population', 'incidence', 'diagnosisRate', 'eligibilityCriteria',
                               'treatmentRate', 'classShare', 'peakProductShare',
                               'annualCostPerPatient', 'discount'],
}

# ══════════════════════════════════════════════════════════════════════════════
# OPENAI CLIENT
# ══════════════════════════════════════════════════════════════════════════════
_api_key = os.getenv("OPENAI_API_KEY", "")
client: OpenAI | None = OpenAI(api_key=_api_key) if _api_key else None
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS  (identical to forecast_server.py)
# ══════════════════════════════════════════════════════════════════════════════
CHAT_SYSTEM = """\
You are an expert AI Forecast Assistant embedded inside a commercial pharmaceutical forecasting tool.
You help users build revenue forecasts for pharmaceutical / biotech assets.

═══ TOOL WORKFLOW — 5 stages ═══════════════════════════════════════════════════════
Stage 1  product_info          – Collect 6 product fields (see below)
Stage 2  parameter_selection   – User picks which epidemiology / market parameters to include
Stage 3  assumptions           – AI-generated assumptions (prevalence, diagnosis rate, etc.) shown in table
Stage 4  forecast_engine       – User sets forecast horizon, pricing, curve settings
Stage 5  results               – Charts and revenue tables displayed
═════════════════════════════════════════════════════════════════════════════════════

You will receive:
  • "workflow_stage" – which stage the user is currently on
  • "form_state"     – current values of the 6 product fields (already filled ones)
  • "chat_step"      – how many of the 6 fields have been filled (0–6)
  • "Next field to collect" – the first EMPTY field name

───── Stage 1 fields ─────────────────────────────────────────────────────────────
  1. country       – MUST be one of exactly: United States, Germany, United Kingdom,
                     France, Japan, China, Canada, Italy, Spain
  2. productName   – drug / compound name (any reasonable string)
  3. classMoa      – drug class or mechanism of action
  4. indication    – therapeutic area
  5. launchYear    – planned launch year (integer 2024–2040)
  6. peakYear      – expected peak-sales year (MUST be > launchYear, integer 2025–2045)

═══ MULTI-FIELD EXTRACTION (CRITICAL) ══════════════════════════════════════════════
When a user sends a single message that contains MULTIPLE field values, extract ALL
provided fields at once into field_updates.
After extracting, identify which fields are STILL missing and ask for the next one.

═══ VALIDATION ════════════════════════════════════════════════════════════════════
• country: Must match one of the 9 allowed countries. "UK"→"United Kingdom", "US"→"United States".
• launchYear: Must be 2024–2040.
• peakYear: Must be 2025–2045 AND > launchYear.
• productName: Any non-empty string.
• classMoa / indication: Any non-empty medical string.

═══ YOUR BEHAVIOUR BY STAGE ════════════════════════════════════════════════════════
▸ Stage 1 – collect missing fields, extract multi-field messages.
  When all 6 filled set action="show_parameter_selection".
▸ Stage 2 – answer parameter questions. quick_replies: ["Generate Assumptions","What is prevalence?"]
▸ Stage 3 – review assumptions. quick_replies: ["Calculate Forecast","Edit assumptions"]
▸ Stage 4 – guide forecast run. quick_replies: ["Calculate Forecast","What is S-curve adoption?"]
▸ Stage 5 – show/export results. quick_replies: ["Export to CSV","Start new forecast"]

═══ OUTPUT FORMAT ════════════════════════════════════════════════════════════════════
Respond ONLY with a JSON object:
{
  "bot_message":    "<string>",
  "field_updates":  { "<fieldName>": "<value>" },
  "quick_replies":  ["<chip1>", "<chip2>"],
  "action":         "<show_parameter_selection|generate_assumptions|calculate_forecast|proceed_results|start_over|>"
}
"""

RESEARCH_SYSTEM = """\
You are a senior commercial pharmaceutical analyst with deep expertise in epidemiology,
market access, and drug pricing.

Given a therapeutic indication, target country, and drug class / MoA, generate realistic
commercial forecast assumptions grounded in published literature and real-world data.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "prevalence":          <float 0–1>,
  "prevalenceRationale": "<string>",
  "diagnosis":           <float 0–1>,
  "diagnosisRationale":  "<string>",
  "treatment":           <float 0–1>,
  "treatmentRationale":  "<string>",
  "biomarker":           <float 0–1>,
  "biomarkerRationale":  "<string>",
  "classShare":          <float 0–1>,
  "classShareRationale": "<string>",
  "productShare":        <float 0–1>,
  "productShareRationale":"<string>",
  "annualCost":          <integer USD>,
  "costRationale":       "<string>",
  "discountRationale":   "<string>"
}
All rates/shares are proportions (0–1), NOT percentages.
"""

RECOMMEND_SYSTEM = """\
You are a commercial forecasting expert specialising in pharmaceutical revenue models.

Available parameter IDs:
  prevalence, incidence, diagnosisRate, severity, treatmentRate, eligibilityCriteria,
  progressionRate, classShare, peakProductShare, annualCostPerPatient, discount

Rules:
  - Include EITHER prevalence OR incidence, never both.
  - Always include classShare, peakProductShare, annualCostPerPatient, discount.
  - For oncology: use incidence, include eligibilityCriteria (biomarker), exclude severity.
  - For rare disease: use prevalence, include eligibilityCriteria.
  - For chronic disease: use prevalence, include treatmentRate.

Respond ONLY with a valid JSON object:
{
  "recommendation": "<2-3 sentences using **bold** for key parameter names>",
  "params": ["<paramId1>", ...]
}
"""

# ══════════════════════════════════════════════════════════════════════════════
# SESSION STATE INIT
# ══════════════════════════════════════════════════════════════════════════════
def init_state() -> None:
    defaults: dict = {
        'current_step': 1,
        'form_state': {k: '' for k in ['country', 'productName', 'classMoa', 'indication', 'launchYear', 'peakYear']},
        'chat_messages': [],           # list of {'role': 'user'|'bot', 'content': str}
        'conversation_history': [],    # OpenAI-format messages
        'chat_step': 0,
        'assumptions': {},
        'forecast_data': [],
        'selected_parameters': {
            'epidemiology': 'prevalence',
            'parameters': ['population', 'prevalence', 'diagnosisRate', 'treatmentRate',
                           'eligibilityCriteria', 'classShare', 'peakProductShare',
                           'annualCostPerPatient', 'discount'],
        },
        'ai_rec_text': '',
        'ai_rec_params': None,
        'show_rationale': True,
        'chat_initialized': False,
        'pending_action': None,
        'quick_replies': [],
        'engine_running': False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


init_state()

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════
FORM_FIELDS = ['country', 'productName', 'classMoa', 'indication', 'launchYear', 'peakYear']
FIELD_LABELS = {
    'country': 'Country', 'productName': 'Product Name',
    'classMoa': 'Class / MoA', 'indication': 'Indication',
    'launchYear': 'Launch Year', 'peakYear': 'Forecast - End Year',
}
STEP_NAMES = {1: 'Product Info', 2: 'Define Flow', 3: 'Assumptions', 4: 'Engine', 5: 'Results'}


def form() -> dict:
    return st.session_state.form_state


def add_bot_msg(text: str, qr: list[str] | None = None) -> None:
    st.session_state.chat_messages.append({'role': 'bot', 'content': text})
    st.session_state.conversation_history.append({'role': 'assistant', 'content': text})
    st.session_state.quick_replies = qr or []


def add_user_msg(text: str) -> None:
    st.session_state.chat_messages.append({'role': 'user', 'content': text})
    st.session_state.conversation_history.append({'role': 'user', 'content': text})


def get_workflow_stage() -> str:
    s = st.session_state.current_step
    return {1: 'product_info', 2: 'parameter_selection', 3: 'assumptions',
            4: 'forecast_engine', 5: 'results'}.get(s, 'product_info')


def all_fields_filled() -> bool:
    return all(str(v).strip() != '' for v in form().values())


def format_bold(text: str) -> str:
    """Convert **bold** markdown to HTML <strong> tags for st.markdown."""
    return re.sub(r'\*\*(.*?)\*\*', r'**\1**', text)


# ══════════════════════════════════════════════════════════════════════════════
# OPENAI API CALLS
# ══════════════════════════════════════════════════════════════════════════════
def _build_context() -> str:
    f = form()
    filled  = [k for k, v in f.items() if v]
    missing = [k for k, v in f.items() if not v]
    lines = [
        "\n\n══ CURRENT CONTEXT ══",
        f"workflow_stage : {get_workflow_stage()}",
        f"fields_filled  : {len(filled)}/6",
        f"fields_filled_list : {filled if filled else '(none yet)'}",
        f"fields_missing_list: {missing if missing else '(all filled!)'}",
    ]
    if f:
        lines.append("form_state (current values):")
        for k, v in f.items():
            status = "✓ FILLED" if v else "✗ EMPTY — collect this"
            lines.append(f"  {k}: {v!r}  [{status}]")
    if missing:
        lines.append(f"\nNext field to collect: {missing[0]}")
        lines.append(f"All remaining missing fields: {', '.join(missing)}")
        lines.append(
            "\nIMPORTANT: Scan the user's message for ANY of the missing fields. "
            "Extract all you can, then ask only for whatever is still missing."
        )
    else:
        lines.append("\nALL 6 FIELDS ARE FILLED — set action=show_parameter_selection immediately.")
    return "\n".join(lines)


def call_chat_api(user_text: str) -> dict:
    """Call OpenAI chat endpoint. Returns parsed JSON dict."""
    if not client:
        return {"bot_message": "OpenAI API key not set. Set OPENAI_API_KEY.", "field_updates": {}, "quick_replies": [], "action": ""}

    system_content = CHAT_SYSTEM + _build_context()
    messages = [{"role": "system", "content": system_content}]
    for m in st.session_state.conversation_history[-20:]:
        messages.append({"role": m["role"], "content": m["content"]})

    resp = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=600,
    )
    raw = resp.choices[0].message.content
    try:
        data = json.loads(raw)
    except Exception:
        data = {}

    # ── Server-side safety (mirrors forecast_server.py) ──
    raw_updates = data.get("field_updates") or {}
    field_updates = {k: v for k, v in raw_updates.items() if v is not None and str(v).strip() != ""}

    all_field_keys = FORM_FIELDS
    merged = {**form(), **field_updates}
    still_missing = [k for k in all_field_keys if not merged.get(k)]

    action = data.get("action") or ""

    if action == "start_over" and not re.search(r"start\s*over|restart|new\s*forecast", user_text, re.I):
        action = ""
    if action == "show_parameter_selection" and still_missing:
        action = ""
    if not still_missing and action not in ("start_over",):
        action = "show_parameter_selection"
    if action == "calculate_forecast" and not re.search(r"calculat|run\s*forecast", user_text, re.I):
        action = ""
    if action == "proceed_results" and not re.search(r"result|chart|show", user_text, re.I):
        action = ""
    if action == "generate_assumptions" and not re.search(r"generat|assumption|next\s*step", user_text, re.I):
        action = ""

    bot_message = data.get("bot_message", "I'm here to help you build your forecast!")
    if not still_missing:
        ask_pat = r"[.!]?\s*(Now[,]?\s*)?(could you|please|can you|what is|what's|provide|tell me)[^.?!]*\??\s*$"
        bot_message = re.sub(ask_pat, "", bot_message, flags=re.I).strip()
        bot_message += "\n\nAll information collected — proceeding to parameter selection!"

    return {
        "bot_message": bot_message,
        "field_updates": field_updates,
        "quick_replies": data.get("quick_replies") or [],
        "action": action,
    }


def call_research_api(indication: str, country: str, class_moa: str) -> dict:
    """Call OpenAI research endpoint or fallback to built-in DB."""
    if not client:
        return _research_fallback(indication, country, class_moa)
    prompt = (
        f"Indication:    {indication}\n"
        f"Country:       {country}\n"
        f"Drug Class/MoA:{class_moa}\n\n"
        "Generate commercial forecast assumptions for this asset."
    )
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": RESEARCH_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=900,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return _research_fallback(indication, country, class_moa)


def call_recommend_api(indication: str, product_name: str, class_moa: str, country: str) -> dict:
    """Call OpenAI recommendation endpoint or fallback."""
    if not client:
        return _recommend_fallback(indication)
    prompt = (
        f"Product:    {product_name or 'unnamed'}\n"
        f"Class/MoA:  {class_moa or 'unknown'}\n"
        f"Indication: {indication or 'unspecified'}\n"
        f"Country:    {country or 'unspecified'}\n\n"
        "Recommend the optimal set of forecast flow parameters for this asset."
    )
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": RECOMMEND_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=400,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return _recommend_fallback(indication)


def _research_fallback(indication: str, country: str, class_moa: str) -> dict:
    d = RESEARCH_DB.get(indication)
    if d:
        return {**d}
    epi = EPIDEMIOLOGY_DEFAULTS.get(indication, EPIDEMIOLOGY_DEFAULTS['Default'])
    return {
        'prevalence': epi['prevalence'], 'prevalenceRationale': f'Prevalence for {indication} – estimated.',
        'diagnosis': epi['diagnosis'], 'diagnosisRationale': 'Diagnosis rate estimated.',
        'treatment': epi['treatment'], 'treatmentRationale': 'Treatment rate estimated.',
        'biomarker': epi['biomarker'], 'biomarkerRationale': 'Eligibility criteria estimated.',
        'classShare': 0.35, 'classShareRationale': f'{class_moa} class share 35% estimated.',
        'productShare': 0.25, 'productShareRationale': 'Product share 25% conservative estimate.',
        'annualCost': 65000, 'costRationale': f'Annual cost $65K for {class_moa} in {country}.',
        'discountRationale': f'Discount based on {country} market averages.',
    }


def _recommend_fallback(indication: str) -> dict:
    ind = indication.lower()
    if any(x in ind for x in ['oncol', 'cancer', 'nsclc', 'leukemia']):
        return {'recommendation': 'Use **Incidence Rate** for oncology assets. Include **Eligibility Criteria** (biomarker) and **Treatment Rate**.', 'params': ['population', 'incidence', 'diagnosisRate', 'eligibilityCriteria', 'treatmentRate', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']}
    elif any(x in ind for x in ['rare', 'orphan']):
        return {'recommendation': 'For **Rare Disease**, focus on **Prevalence Rate**, **Diagnosis Rate**, and **Eligibility Criteria**.', 'params': ['population', 'prevalence', 'diagnosisRate', 'eligibilityCriteria', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']}
    else:
        return {'recommendation': 'For chronic disease, include **Prevalence Rate**, **Diagnosis Rate**, **Treatment Rate**, and **Eligibility Criteria**.', 'params': ['population', 'prevalence', 'diagnosisRate', 'treatmentRate', 'eligibilityCriteria', 'classShare', 'peakProductShare', 'annualCostPerPatient', 'discount']}


# ══════════════════════════════════════════════════════════════════════════════
# FORECAST CALCULATION  (mirrors HTML JavaScript)
# ══════════════════════════════════════════════════════════════════════════════
def calculate_share_by_year(sp: dict, year_idx: int, peak_time: int) -> float:
    ttp = sp.get('timeToPeak', peak_time) or peak_time
    ss  = sp.get('startingShare', 0.05)
    pk  = sp.get('value', 0.0)
    ct  = sp.get('curveType', 'scurve')
    if year_idx == 0:
        return ss
    t = year_idx / ttp
    if ct == 'linear':
        return pk if t >= 1 else ss + (pk - ss) * t
    elif ct == 'exponential':
        return pk if t >= 1 else ss + (pk - ss) * (t ** 2)
    else:  # s-curve
        if t >= 1:
            df = (t - 1) * 0.15
            return max(pk * 0.70, pk * (1 - df))
        return ss + (pk - ss) / (1 + math.exp(-5 * (t - 0.5)))


def run_forecast(asmp: dict, sel_params: dict) -> list[dict]:
    launch_year = asmp['launchYear']
    peak_year   = asmp['peakYear']
    horizon     = peak_year - launch_year + 5
    params      = sel_params.get('parameters', [])

    # Build eligible patient pool
    ep = asmp.get('population', {}).get('value', 0) or 0.0
    for p in params:
        if p == 'population':
            pass
        elif p == 'prevalence' and asmp.get('prevalence'):
            ep *= asmp['prevalence']['value']
        elif p == 'incidence' and asmp.get('incidence'):
            ep *= asmp['incidence']['value']
        elif p == 'severity' and asmp.get('severity'):
            ep *= asmp['severity']['value']
        elif p == 'diagnosisRate' and asmp.get('diagnosisRate'):
            ep *= asmp['diagnosisRate']['value']
        elif p == 'treatmentRate' and asmp.get('treatmentRate'):
            ep *= asmp['treatmentRate']['value']
        elif p == 'eligibilityCriteria' and asmp.get('eligibilityCriteria'):
            ep *= asmp['eligibilityCriteria']['value']
        elif p == 'progressionRate' and asmp.get('progressionRate'):
            ep *= (1 - asmp['progressionRate']['value'] * 0.5)

    peak_time = asmp.get('adoptionPeakTime', {}).get('value', peak_year - launch_year) or (peak_year - launch_year)
    rows = []
    for i in range(horizon + 1):
        year = launch_year + i
        cs   = calculate_share_by_year(asmp.get('classShare', {}), i, int(peak_time))
        ps   = calculate_share_by_year(asmp.get('peakProductShare', {}), i, int(peak_time))
        tp   = ep * cs * ps
        ac   = asmp.get('annualCostPerPatient', {}).get('value', 65000) or 65000
        gs   = (tp * ac) / 1e6
        dr   = asmp.get('discount', {}).get('value', 0.20) or 0.20
        ns   = gs * (1 - dr)
        rows.append({
            'Year': year,
            'Eligible Patients': int(ep),
            'Class Share %': round(cs * 100, 1),
            'Product Share %': round(ps * 100, 1),
            'Treated Patients': int(tp),
            'Annual Cost/Patient': int(ac),
            'Gross Sales ($M)': round(gs, 1),
            'Discount %': round(dr * 100, 0),
            'Net Sales ($M)': round(ns, 1),
        })
    return rows


def build_assumptions(rd: dict, f: dict, sel_params: dict) -> dict:
    country     = f['country']
    launch_year = int(f['launchYear'])
    peak_year   = int(f['peakYear'])
    population  = POPULATION_DATA.get(country, 100_000_000)
    disc_info   = DISCOUNT_RATES.get(country, {'base': 0.20, 'range': '15-28%'})
    params      = sel_params.get('parameters', [])

    a: dict = {
        'country': country, 'productName': f['productName'],
        'classMoa': f['classMoa'], 'indication': f['indication'],
        'launchYear': launch_year, 'peakYear': peak_year,
    }

    if 'population' in params:
        a['population'] = {'value': population, 'unit': 'persons',
                           'range': f'{int(population*.95):,} – {int(population*1.05):,}',
                           'rationale': f'Total population in {country} (2024 census).'}
    if 'prevalence' in params:
        a['prevalence'] = {'value': rd['prevalence'], 'unit': 'rate', 'unitType': 'rate',
                           'range': f'{rd["prevalence"]*.7:.4f} – {rd["prevalence"]*1.3:.4f}',
                           'rationale': rd['prevalenceRationale']}
    if 'incidence' in params:
        inc = rd['prevalence'] * 0.15
        a['incidence'] = {'value': inc, 'unit': 'rate', 'unitType': 'rate',
                          'range': f'{rd["prevalence"]*.10:.4f} – {rd["prevalence"]*.25:.4f}',
                          'rationale': f'Annual incidence for {f["indication"]}.'}
    if 'severity' in params:
        a['severity'] = {'value': 0.65, 'unit': '%', 'range': '45% – 85%',
                         'rationale': 'Moderate-to-severe or specific subtype.'}
    if 'diagnosisRate' in params:
        a['diagnosisRate'] = {'value': rd['diagnosis'], 'unit': '%',
                              'range': f'{rd["diagnosis"]*.85*100:.0f}% – {rd["diagnosis"]*1.1*100:.0f}%',
                              'rationale': rd['diagnosisRationale']}
    if 'treatmentRate' in params:
        a['treatmentRate'] = {'value': rd['treatment'], 'unit': '%',
                              'range': f'{rd["treatment"]*.80*100:.0f}% – {rd["treatment"]*1.15*100:.0f}%',
                              'rationale': rd['treatmentRationale']}
    if 'eligibilityCriteria' in params:
        a['eligibilityCriteria'] = {'value': rd['biomarker'], 'unit': '%',
                                    'range': f'{rd["biomarker"]*.75*100:.0f}% – {rd["biomarker"]*1.15*100:.0f}%',
                                    'rationale': rd['biomarkerRationale']}
    if 'progressionRate' in params:
        a['progressionRate'] = {'value': 0.18, 'unit': '%/year', 'range': '10% – 30%',
                                'rationale': 'Annual disease progression rate.'}
    if 'classShare' in params:
        a['classShare'] = {'value': rd['classShare'], 'startingShare': 0.05,
                           'timeToPeak': peak_year - launch_year, 'curveType': 'scurve',
                           'unit': '%', 'range': '20% – 55%',
                           'rationale': rd['classShareRationale']}
    if 'peakProductShare' in params:
        a['peakProductShare'] = {'value': rd['productShare'], 'startingShare': 0.03,
                                 'timeToPeak': peak_year - launch_year, 'curveType': 'scurve',
                                 'unit': '%', 'range': '15% – 40%',
                                 'rationale': rd['productShareRationale']}
    if 'annualCostPerPatient' in params:
        a['annualCostPerPatient'] = {'value': rd['annualCost'], 'unit': '$',
                                     'range': '$45,000 – $95,000', 'rationale': rd['costRationale']}
    if 'discount' in params:
        a['discount'] = {'value': disc_info['base'], 'unit': '%',
                         'range': disc_info['range'], 'rationale': rd['discountRationale']}
    a['adoptionPeakTime'] = {'value': peak_year - launch_year, 'unit': 'years',
                             'range': f'{max(2, peak_year-launch_year-2)} – {peak_year-launch_year+2} years',
                             'rationale': 'S-curve adoption from launch to peak.'}
    return a


# ══════════════════════════════════════════════════════════════════════════════
# HANDLE CHAT MESSAGE
# ══════════════════════════════════════════════════════════════════════════════
def handle_chat_message(user_text: str) -> None:
    add_user_msg(user_text)
    lower = user_text.lower().strip()

    # ── Local command shortcuts ──────────────────────────────────────────────
    is_question = '?' in user_text or re.match(
        r'^\s*(what|how|which|why|when|where|who|can|could|should|would|is|are|does|do|tell|explain|help|please|i want to know)',
        user_text, re.I)
    word_count = len(user_text.split())
    is_command = not is_question and word_count <= 9

    if is_command:
        if re.match(r'^(generate\s*(now|assumptions?)?|next\s*step)$', lower):
            if st.session_state.current_step == 2:
                add_bot_msg('Starting **assumption generation**…', ['Generate Now'])
                st.session_state.pending_action = 'generate_assumptions'
                return
            else:
                add_bot_msg('Proceeding to **Define Forecast Flow**…')
                st.session_state.pending_action = 'show_parameter_selection'
                return
        if re.match(r'^(calculate forecast|run forecast|calculate|run)$', lower):
            add_bot_msg('Running the **Forecast Engine** now…')
            st.session_state.pending_action = 'calculate_forecast'
            return
        if re.match(r'^(view results?|show (results?|charts?)|results?|charts?)$', lower):
            add_bot_msg('Jumping to **Results & Charts**.')
            st.session_state.pending_action = 'proceed_results'
            return
        if re.match(r'^(start over|restart|new forecast)$', lower):
            add_bot_msg('Starting a **new forecast**. Fill in the product details!')
            st.session_state.pending_action = 'start_over'
            return
        if re.match(r'^(export|export (to )?csv|download( csv)?)$', lower):
            add_bot_msg('Use the **Export to CSV** button in the Results section.')
            return
        if re.match(r'^apply\s*(ai\s*)?(recommendation|rec)$', lower):
            add_bot_msg('Applying **AI recommendation** for parameters.')
            st.session_state.pending_action = 'apply_ai_rec'
            return

    # ── Call OpenAI ──────────────────────────────────────────────────────────
    try:
        data = call_chat_api(user_text)
    except Exception as e:
        add_bot_msg(f'⚠️ Backend error: {e}. Please check your API key.')
        return

    fu = data.get('field_updates', {})
    if fu:
        for k, v in fu.items():
            if v and str(v).strip():
                st.session_state.form_state[k] = str(v).strip()
        if all_fields_filled():
            st.session_state.chat_step = 6

    action = data.get('action', '')
    if action:
        st.session_state.pending_action = action

    add_bot_msg(data.get('bot_message', ''), data.get('quick_replies', []))


# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR — navigation & step tracker
# ══════════════════════════════════════════════════════════════════════════════
def render_sidebar() -> None:
    with st.sidebar:
        st.markdown("## 📈 ForecastAI")
        st.caption("Commercial Forecast Agent")
        st.divider()

        st.markdown("**Navigation**")
        nav_items = ['Forecast Agent', 'Dashboard (soon)', 'Scenarios (soon)', 'Reports (soon)', 'Settings (soon)']
        for idx, item in enumerate(nav_items):
            if idx == 0:
                st.markdown(f"🟢 **{item}**")
            else:
                st.markdown(f"⬜ {item}")

        st.divider()
        st.markdown("**Forecast Progress**")
        for i in range(1, 6):
            name = STEP_NAMES[i]
            cs   = st.session_state.current_step
            if i < cs:
                icon = "✅"
                w    = "**"
            elif i == cs:
                icon = "🔵"
                w    = "**"
            else:
                icon = "○"
                w    = ""
            label = f"{icon} {w}Step {i}: {name}{w}"
            if st.sidebar.button(label, key=f"nav_btn_{i}", use_container_width=True,
                                  disabled=(i > cs)):
                st.session_state.current_step = i
                st.rerun()

        st.divider()
        if not _api_key:
            st.warning("⚠️ Set OPENAI_API_KEY to enable AI features.", icon="⚠️")


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 – PRODUCT INFORMATION
# ══════════════════════════════════════════════════════════════════════════════
def render_product_info() -> None:
    st.markdown("### Step 1 — Product Information")
    st.caption("Fill in the 6 required fields, or use the AI Copilot chat to provide them conversationally.")

    f = st.session_state.form_state

    c1, c2, c3 = st.columns(3)
    with c1:
        country = st.selectbox("Country *", [''] + COUNTRIES, index=COUNTRIES.index(f['country']) + 1 if f['country'] in COUNTRIES else 0, key="sb_country")
        f['country'] = country if country != '' else ''
    with c2:
        f['productName'] = st.text_input("Product Name *", value=f['productName'], key="ti_product", placeholder="e.g., ABC-101")
    with c3:
        f['classMoa'] = st.text_input("Class / MoA *", value=f['classMoa'], key="ti_class", placeholder="e.g., Monoclonal Antibody")

    c4, c5, c6 = st.columns(3)
    with c4:
        f['indication'] = st.text_input("Indication *", value=f['indication'], key="ti_ind", placeholder="e.g., Rheumatoid Arthritis")
    with c5:
        ly_val = int(f['launchYear']) if str(f['launchYear']).isdigit() else 2027
        ly = st.number_input("Launch Year *", min_value=2024, max_value=2040, value=ly_val, key="ni_launch")
        f['launchYear'] = str(ly)
    with c6:
        py_val = int(f['peakYear']) if str(f['peakYear']).isdigit() else 2032
        py = st.number_input("Forecast - End Year *", min_value=2025, max_value=2045, value=py_val, key="ni_peak")
        f['peakYear'] = str(py)

    st.markdown("")
    st.session_state.form_state = f  # persist

    if st.button("Define Forecast Flow →", type="primary", key="btn_def_flow"):
        f2 = st.session_state.form_state
        if not all(str(f2[k]).strip() for k in FORM_FIELDS):
            st.error("Please fill in all 6 required fields.")
        elif int(f2['peakYear']) <= int(f2['launchYear']):
            st.error("Forecast - End Year must be after launch year.")
        else:
            st.session_state.current_step = 2
            # Trigger AI recommendation
            st.session_state.pending_action = 'load_ai_rec'
            add_bot_msg(
                f"✓ Product info saved!\n\nChoose a **template preset** or let me **apply an AI recommendation** for **{f2['indication']}** in **{f2['country']}**.",
                ["Apply AI Recommendation", "Generate Now", "Customise Parameters"],
            )
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 – PARAMETER SELECTION
# ══════════════════════════════════════════════════════════════════════════════
def render_parameter_selection() -> None:
    st.markdown("### Step 2 — Define Forecast Flow")
    st.caption("Choose a template to auto-configure parameters, or customise manually below.")

    f = st.session_state.form_state
    sp = st.session_state.selected_parameters

    # -- Preset chips (radio buttons styled as buttons)
    st.markdown("**Template Preset:**")
    preset_cols = st.columns(4)
    preset_names = ['Standard Pharma Launch', 'Rare Disease', 'Oncology', 'Custom']
    selected_preset = st.radio("", preset_names, horizontal=True, key="preset_radio", label_visibility="collapsed")

    if selected_preset != 'Custom':
        preset_params = PRESETS.get(selected_preset, sp['parameters'])
    else:
        preset_params = None  # user will configure manually

    # -- AI Recommendation Banner
    rec_text = st.session_state.get('ai_rec_text', '')
    if rec_text:
        st.markdown(f"""<div class="ai-banner">🤖 <strong>AI Recommendation</strong><br>{rec_text}</div>""", unsafe_allow_html=True)
        if st.button("Apply AI Recommendation", key="btn_apply_ai_rec"):
            rec_params = st.session_state.get('ai_rec_params')
            if rec_params:
                st.session_state.selected_parameters['parameters'] = ['population'] + rec_params
                if 'incidence' in rec_params:
                    st.session_state.selected_parameters['epidemiology'] = 'incidence'
                else:
                    st.session_state.selected_parameters['epidemiology'] = 'prevalence'
                add_bot_msg(
                    f"**AI recommendation applied** for **{f['indication']}**.\n\nParameters auto-selected. Ready to generate assumptions?",
                    ["Generate Assumptions", "Customise Parameters"],
                )
            st.rerun()

    st.markdown("")
    st.markdown("#### Parameter Configuration")

    # -- Epidemiology section
    with st.expander("📊 Epidemiology", expanded=True):
        c1, c2 = st.columns(2)
        with c1:
            epi_type = st.radio("Epidemiology Type", ['Prevalence Rate', 'Incidence Rate'],
                                key="epi_radio",
                                index=0 if sp['epidemiology'] != 'incidence' else 1)
            sp['epidemiology'] = 'incidence' if epi_type == 'Incidence Rate' else 'prevalence'
        with c2:
            incl_severity = st.checkbox("Include Severity / Subtype %", value='severity' in sp['parameters'], key="cb_severity")
            incl_diag = st.checkbox("Include Diagnosis Rate", value='diagnosisRate' in sp['parameters'], key="cb_diag")

    # -- Treatment Flow
    with st.expander("💊 Treatment Flow", expanded=True):
        incl_treat = st.checkbox("Treatment Rate", value='treatmentRate' in sp['parameters'], key="cb_treat")
        incl_elig  = st.checkbox("Eligibility Criteria (Biomarker / LoT)", value='eligibilityCriteria' in sp['parameters'], key="cb_elig")
        incl_prog  = st.checkbox("Progression Rate", value='progressionRate' in sp['parameters'], key="cb_prog")

    # -- Market Dynamics
    with st.expander("📈 Market Dynamics", expanded=True):
        incl_cs  = st.checkbox("Peak Class Share", value='classShare' in sp['parameters'], key="cb_cs")
        incl_pps = st.checkbox("Peak Product Share", value='peakProductShare' in sp['parameters'], key="cb_pps")

    # -- Pricing
    with st.expander("💰 Pricing & Access", expanded=True):
        incl_acp  = st.checkbox("Annual Cost per Patient", value='annualCostPerPatient' in sp['parameters'], key="cb_acp")
        incl_disc = st.checkbox("Discount / Rebate Rate", value='discount' in sp['parameters'], key="cb_disc")

    # Build selected parameters list
    params = ['population', sp['epidemiology']]
    if incl_severity:  params.append('severity')
    if incl_diag:      params.append('diagnosisRate')
    if incl_treat:     params.append('treatmentRate')
    if incl_elig:      params.append('eligibilityCriteria')
    if incl_prog:      params.append('progressionRate')
    if incl_cs:        params.append('classShare')
    if incl_pps:       params.append('peakProductShare')
    if incl_acp:       params.append('annualCostPerPatient')
    if incl_disc:      params.append('discount')

    # Apply preset override if selected
    if preset_params is not None:
        params = preset_params
        sp['epidemiology'] = 'incidence' if 'incidence' in preset_params else 'prevalence'

    sp['parameters'] = params
    st.session_state.selected_parameters = sp

    # -- Flow Preview
    st.markdown("**Forecast Flow Preview:**")
    flow_html = ' <span class="flow-arrow">→</span> '.join(
        f'<span class="flow-step">{PARAMETER_LABELS.get(p, p)}</span>' for p in params
    )
    st.markdown(f"<div style='margin:8px 0;flex-wrap:wrap;display:flex;align-items:center;gap:4px;'>{flow_html}</div>", unsafe_allow_html=True)

    st.markdown("")
    col_gen, col_back = st.columns([1, 5])
    with col_gen:
        if st.button("Generate Assumptions →", type="primary", key="btn_gen_asmp"):
            st.session_state.pending_action = 'generate_assumptions'
            st.rerun()
    with col_back:
        if st.button("← Back", key="btn_back_1"):
            st.session_state.current_step = 1
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 – ASSUMPTIONS
# ══════════════════════════════════════════════════════════════════════════════
def render_assumptions() -> None:
    st.markdown("### Step 3 — Forecast Assumptions & Validation")
    st.caption("Review and modify epidemiological, market, and pricing assumptions below.")

    asmp = st.session_state.assumptions
    sp   = st.session_state.selected_parameters

    # Validation banners
    warnings = []
    if asmp.get('diagnosisRate', {}).get('value', 1) < 0.50:
        warnings.append("Diagnosis rate below 50% — verify data.")
    if asmp.get('peakProductShare', {}).get('value', 0) > 0.40:
        warnings.append("Product share above 40% — high for new entrant.")
    if asmp.get('discount', {}).get('value', 0) > 0.30:
        warnings.append("Discount above 30% — verify benchmarks.")
    if asmp.get('treatmentRate', {}).get('value', 1) < 0.40:
        warnings.append("Treatment rate below 40%.")

    if warnings:
        for w in warnings:
            st.warning(w)
    else:
        st.success(f"✅ All {len(sp['parameters'])} parameters validated.")

    # -- Flow preview inside assumptions
    flow_html = ' → '.join(PARAMETER_LABELS.get(p, p) for p in sp['parameters'])
    st.markdown(f"**Active Forecast Flow:** `{flow_html}`")
    st.markdown("")

    # -- Editable table
    rows = []
    for key in sp['parameters']:
        if key not in asmp:
            continue
        d = asmp[key]
        label = PARAMETER_LABELS.get(key, key)

        if key in ('classShare', 'peakProductShare'):
            raw_val = f"{d['value']*100:.1f}%  (start: {d.get('startingShare',0.05)*100:.1f}%,  curve: {d.get('curveType','scurve')})"
        elif d['unit'] == '%':
            raw_val = f"{d['value']*100:.1f}%"
        elif d['unit'] == 'rate':
            raw_val = f"{d['value']:.4f}"
        elif d['unit'] == '$':
            raw_val = f"${d['value']:,.0f}"
        elif d['unit'] == 'persons':
            raw_val = f"{d['value']:,.0f}"
        else:
            raw_val = str(d['value'])

        rows.append({
            'Parameter': label, 'Value': raw_val,
            'Unit': d['unit'], 'Range': d.get('range', ''),
            'Rationale': d.get('rationale', ''),
        })

    if asmp.get('adoptionPeakTime'):
        d = asmp['adoptionPeakTime']
        rows.append({'Parameter': 'Time to Peak (Years)', 'Value': str(d['value']),
                     'Unit': 'years', 'Range': d.get('range', ''), 'Rationale': d.get('rationale', '')})

    if rows:
        df_asmp = pd.DataFrame(rows)
        if not st.session_state.show_rationale:
            df_asmp = df_asmp.drop(columns=['Rationale'])
        st.dataframe(df_asmp, use_container_width=True, hide_index=True)

    st.toggle("Show Rationale Column", value=st.session_state.show_rationale, key="toggle_rationale_display",
              on_change=lambda: st.session_state.update({'show_rationale': st.session_state.toggle_rationale_display}))

    # -- Inline editors for key parameters
    st.markdown("#### ✏️ Edit Assumptions")
    with st.expander("Adjust key values", expanded=False):
        updated = False
        for key in sp['parameters']:
            if key not in asmp or key in ('population', 'adoptionPeakTime'):
                continue
            d = asmp[key]
            col1, col2 = st.columns([2, 1])
            with col1:
                label = PARAMETER_LABELS.get(key, key)
                if d['unit'] in ('%',):
                    new_val_pct = st.number_input(f"{label} (%)", value=round(d['value']*100, 1),
                                                  min_value=0.0, max_value=100.0, step=0.1,
                                                  key=f"edit_{key}")
                    new_val = new_val_pct / 100
                elif d['unit'] == 'rate':
                    new_val = st.number_input(f"{label} (rate 0–1)", value=float(d['value']),
                                              min_value=0.0, max_value=1.0, step=0.001, format="%.4f",
                                              key=f"edit_{key}")
                elif d['unit'] == '$':
                    new_val = st.number_input(f"{label} (USD)", value=int(d['value']),
                                              min_value=0, step=1000, key=f"edit_{key}")
                else:
                    new_val = st.number_input(label, value=float(d['value']), key=f"edit_{key}")
                if new_val != d['value']:
                    asmp[key]['value'] = new_val
                    updated = True
            if key in ('classShare', 'peakProductShare'):
                with col2:
                    curve = st.selectbox(f"{label} Curve", ['scurve', 'linear', 'exponential'],
                                         index=['scurve', 'linear', 'exponential'].index(d.get('curveType', 'scurve')),
                                         key=f"curve_{key}")
                    if curve != d.get('curveType'):
                        asmp[key]['curveType'] = curve
                        updated = True
        if updated:
            st.session_state.assumptions = asmp
            st.success("Assumptions updated.")

    st.markdown("")
    cola, colb = st.columns([1, 5])
    with cola:
        if st.button("Calculate Forecast →", type="primary", key="btn_calc"):
            st.session_state.pending_action = 'calculate_forecast'
            st.rerun()
    with colb:
        if st.button("← Back to Parameters", key="btn_back_2"):
            st.session_state.current_step = 2
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 – FORECAST ENGINE
# ══════════════════════════════════════════════════════════════════════════════
def render_forecast_engine() -> None:
    st.markdown("### Step 4 — Forecast Engine")

    asmp = st.session_state.assumptions
    sp   = st.session_state.selected_parameters
    fd   = st.session_state.forecast_data

    if not fd:
        st.info("Run the forecast engine to generate year-by-year calculations.")
        if st.button("Run Forecast Engine", type="primary", key="btn_run_eng"):
            st.session_state.pending_action = 'calculate_forecast'
            st.rerun()
        return

    st.success("✅ Forecast engine complete! Year-by-year calculations below.")

    # -- Year-by-year calculation sheet (first 5 years)
    launch_year = asmp['launchYear']
    peak_year   = asmp['peakYear']
    peak_time   = asmp.get('adoptionPeakTime', {}).get('value', peak_year - launch_year) or (peak_year - launch_year)

    # Build eligible patients step-by-step
    ep = asmp.get('population', {}).get('value', 0) or 0
    ep_steps: list[tuple[str, float, float, float]] = []  # (label, factor, before, after)
    for p in sp['parameters']:
        if p == 'population':
            prev = ep
            ep_steps.append(('Total Population', ep, prev, ep))
        elif p == 'prevalence' and asmp.get('prevalence'):
            prev = ep; ep *= asmp['prevalence']['value']
            ep_steps.append(('× Prevalence Rate', asmp['prevalence']['value'], prev, ep))
        elif p == 'incidence' and asmp.get('incidence'):
            prev = ep; ep *= asmp['incidence']['value']
            ep_steps.append(('× Incidence Rate', asmp['incidence']['value'], prev, ep))
        elif p == 'diagnosisRate' and asmp.get('diagnosisRate'):
            prev = ep; ep *= asmp['diagnosisRate']['value']
            ep_steps.append((f"× Diagnosis Rate ({asmp['diagnosisRate']['value']*100:.1f}%)", asmp['diagnosisRate']['value'], prev, ep))
        elif p == 'treatmentRate' and asmp.get('treatmentRate'):
            prev = ep; ep *= asmp['treatmentRate']['value']
            ep_steps.append((f"× Treatment Rate ({asmp['treatmentRate']['value']*100:.1f}%)", asmp['treatmentRate']['value'], prev, ep))
        elif p == 'eligibilityCriteria' and asmp.get('eligibilityCriteria'):
            prev = ep; ep *= asmp['eligibilityCriteria']['value']
            ep_steps.append((f"× Eligibility Criteria ({asmp['eligibilityCriteria']['value']*100:.1f}%)", asmp['eligibilityCriteria']['value'], prev, ep))
        elif p == 'severity' and asmp.get('severity'):
            prev = ep; ep *= asmp['severity']['value']
            ep_steps.append((f"× Severity Filter ({asmp['severity']['value']*100:.1f}%)", asmp['severity']['value'], prev, ep))

    # Epidemiology summary
    st.markdown("#### Epidemiology Build-Up")
    epi_rows = [{'Step': s[0], 'Factor': f'{s[1]:.4f}' if s[1] < 1 else f'{int(s[1]):,}',
                 'Before': f'{int(s[2]):,}', 'After': f'{int(s[3]):,}'} for s in ep_steps]
    st.dataframe(pd.DataFrame(epi_rows), use_container_width=True, hide_index=True)

    # Revenue for years 0-4
    st.markdown("#### Year-by-Year Revenue Build-Up (First 5 Years)")
    rev_rows = []
    for i in range(min(5, len(fd))):
        row = fd[i]
        rev_rows.append({
            'Year': row['Year'],
            'Eligible Pts': f"{row['Eligible Patients']:,}",
            'Class Sh %': f"{row['Class Share %']}%",
            'Prod Sh %': f"{row['Product Share %']}%",
            'Treated Pts': f"{row['Treated Patients']:,}",
            'Cost/Pt ($)': f"${row['Annual Cost/Patient']:,}",
            'Gross ($M)': f"${row['Gross Sales ($M)']}M",
            'Disc %': f"{int(row['Discount %'])}%",
            'Net ($M)': f"${row['Net Sales ($M)']}M",
        })
    st.dataframe(pd.DataFrame(rev_rows), use_container_width=True, hide_index=True)

    if len(fd) > 5:
        st.caption(f"Showing first 5 of {len(fd)} years. Full table in Results.")

    st.markdown("")
    col_res, col_back = st.columns([1, 5])
    with col_res:
        if st.button("View Summary & Charts →", type="primary", key="btn_to_results"):
            st.session_state.current_step = 5
            st.rerun()
    with col_back:
        if st.button("← Back to Assumptions", key="btn_back_3"):
            st.session_state.current_step = 3
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 – RESULTS
# ══════════════════════════════════════════════════════════════════════════════
def render_results() -> None:
    st.markdown("### Step 5 — Forecast Summary & Commercial Potential")
    st.caption("Peak sales projections and annual forecast trajectory with visual analytics.")

    fd   = st.session_state.forecast_data
    asmp = st.session_state.assumptions

    if not fd:
        st.info("No forecast data yet. Complete the previous steps first.")
        return

    df = pd.DataFrame(fd)

    # -- Peak metrics
    max_ns_idx = df['Net Sales ($M)'].idxmax()
    max_ns     = df.loc[max_ns_idx, 'Net Sales ($M)']
    max_ns_yr  = df.loc[max_ns_idx, 'Year']
    max_gs     = df.loc[max_ns_idx, 'Gross Sales ($M)']
    max_pts    = df.loc[max_ns_idx, 'Treated Patients']
    launch_yr  = asmp.get('launchYear', max_ns_yr)
    disc_pct   = asmp.get('discount', {}).get('value', 0.20) * 100

    # ── Insight Cards ──────────────────────────────────────────────────────
    ic1, ic2, ic3 = st.columns(3)
    with ic1:
        st.markdown(f"""<div class="insight-card" style="border-left:4px solid #21808d;">
            <div class="insight-label">Peak Net Sales</div>
            <div class="insight-value">${max_ns:.1f}M</div>
            <div class="insight-sub">Achieved in Year {max_ns_yr - launch_yr} ({max_ns_yr})</div>
        </div>""", unsafe_allow_html=True)
    with ic2:
        pts_fmt = f"{max_pts/1000:.1f}K" if max_pts >= 1000 else str(max_pts)
        st.markdown(f"""<div class="insight-card" style="border-left:4px solid #16a34a;">
            <div class="insight-label">Peak Patient Volume</div>
            <div class="insight-value">{pts_fmt}</div>
            <div class="insight-sub">Treated patients at peak</div>
        </div>""", unsafe_allow_html=True)
    with ic3:
        net_pct = 100 - disc_pct
        st.markdown(f"""<div class="insight-card" style="border-left:4px solid #2563eb;">
            <div class="insight-label">Gross → Net</div>
            <div class="insight-value">${max_gs:.1f}M</div>
            <div class="insight-sub">{disc_pct:.0f}% discount → {net_pct:.0f}% net realisation</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("")

    # AI insight text
    yr_to_peak = max_ns_yr - launch_yr
    if max_ns >= 1000:
        peak_desc = f"Blockbuster potential with **${max_ns/1000:.1f}B** peak net sales."
    elif max_ns >= 500:
        peak_desc = f"Strong commercial profile at **${max_ns:.0f}M** peak net sales."
    else:
        peak_desc = f"Developing commercial profile at **${max_ns:.0f}M** peak net sales."
    st.info(f"🤖 **AI Insight:** Peak achieved in Year {yr_to_peak}. {peak_desc}")

    # ── Summary metric cards ────────────────────────────────────────────────
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Peak Sales Year", str(max_ns_yr))
    m2.metric("Peak Gross Sales", f"${max_gs:.1f}M")
    m3.metric("Peak Net Sales",   f"${max_ns:.1f}M")
    m4.metric("Peak Patient Volume", f"{max_pts:,}")

    st.markdown("")

    # ── Charts ──────────────────────────────────────────────────────────────
    col_c1, col_c2 = st.columns(2)
    years = df['Year'].tolist()

    with col_c1:
        st.markdown("**Sales Projection Over Time**")
        fig_sales = go.Figure()
        fig_sales.add_trace(go.Scatter(x=years, y=df['Gross Sales ($M)'].tolist(),
                                       mode='lines+markers', name='Gross Sales ($M)',
                                       fill='tozeroy', fillcolor='rgba(33,128,141,0.1)',
                                       line=dict(color='rgba(33,128,141,1)', width=3)))
        fig_sales.add_trace(go.Scatter(x=years, y=df['Net Sales ($M)'].tolist(),
                                       mode='lines+markers', name='Net Sales ($M)',
                                       fill='tozeroy', fillcolor='rgba(50,184,198,0.1)',
                                       line=dict(color='rgba(50,184,198,1)', width=3)))
        fig_sales.update_layout(margin=dict(l=0, r=0, t=20, b=0), height=320,
                                xaxis_title='Year', yaxis_title='Sales ($M)',
                                legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1))
        st.plotly_chart(fig_sales, use_container_width=True)

    with col_c2:
        st.markdown("**Patient Volume Growth**")
        fig_pts = go.Figure()
        fig_pts.add_trace(go.Bar(x=years, y=df['Treated Patients'].tolist(),
                                  name='Treated Patients',
                                  marker_color='rgba(33,128,141,0.7)'))
        fig_pts.update_layout(margin=dict(l=0, r=0, t=20, b=0), height=320,
                               xaxis_title='Year', yaxis_title='Patients')
        st.plotly_chart(fig_pts, use_container_width=True)

    st.markdown("**Market Share Evolution**")
    fig_share = go.Figure()
    fig_share.add_trace(go.Scatter(x=years, y=df['Class Share %'].tolist(),
                                    mode='lines+markers', name='Class Share %',
                                    fill='tozeroy', fillcolor='rgba(168,75,47,0.1)',
                                    line=dict(color='rgba(168,75,47,1)', width=3)))
    fig_share.add_trace(go.Scatter(x=years, y=df['Product Share %'].tolist(),
                                    mode='lines+markers', name='Product Share %',
                                    fill='tozeroy', fillcolor='rgba(230,129,97,0.1)',
                                    line=dict(color='rgba(230,129,97,1)', width=3)))
    fig_share.update_layout(margin=dict(l=0, r=0, t=20, b=0), height=280,
                             xaxis_title='Year', yaxis_title='Share (%)',
                             legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1))
    st.plotly_chart(fig_share, use_container_width=True)

    # ── Annual Forecast Table ───────────────────────────────────────────────
    st.markdown("#### Annual Forecast Details")
    display_df = df.copy()
    display_df['Eligible Patients'] = display_df['Eligible Patients'].apply(lambda x: f"{x:,}")
    display_df['Treated Patients']  = display_df['Treated Patients'].apply(lambda x: f"{x:,}")
    display_df['Annual Cost/Patient'] = display_df['Annual Cost/Patient'].apply(lambda x: f"${x:,}")
    display_df['Gross Sales ($M)']   = display_df['Gross Sales ($M)'].apply(lambda x: f"${x}M")
    display_df['Net Sales ($M)']     = display_df['Net Sales ($M)'].apply(lambda x: f"${x}M")
    display_df['Class Share %']      = display_df['Class Share %'].apply(lambda x: f"{x}%")
    display_df['Product Share %']    = display_df['Product Share %'].apply(lambda x: f"{x}%")
    display_df['Discount %']         = display_df['Discount %'].apply(lambda x: f"{x:.0f}%")
    st.dataframe(display_df, use_container_width=True, hide_index=True)

    # ── Export / Start Over ─────────────────────────────────────────────────
    ec1, ec2 = st.columns([1, 1])
    with ec1:
        csv_buf = StringIO()
        df.to_csv(csv_buf, index=False)
        prod = asmp.get('productName', 'Forecast')
        st.download_button(
            label="📥 Export to CSV",
            data=csv_buf.getvalue(),
            file_name=f"{prod}_Forecast.csv",
            mime="text/csv",
            key="btn_export",
        )
    with ec2:
        if st.button("🔄 Start New Forecast", key="btn_new_forecast"):
            st.session_state.pending_action = 'start_over'
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# CHAT PANEL
# ══════════════════════════════════════════════════════════════════════════════
def render_chat_panel() -> None:
    st.markdown("""
    <div style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,.07);">
        <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;"></div>
        <strong style="font-size:14px;">AI Copilot</strong>
    </div>
    """, unsafe_allow_html=True)

    # -- Welcome message (once)
    if not st.session_state.chat_initialized:
        f = st.session_state.form_state
        welcome = (
            "Hello! I'm your **AI Forecast Assistant**.\n\n"
            "Tell me about your asset in one message, e.g.:\n"
            "_Forecast for **Keytruda** (PD-1 inhibitor) in the US for NSCLC, **launching 2026**, **forecast end year 2031**_\n\n"
            "Or I'll ask step by step.\n\n"
            "**Which country are you targeting?**\n\n"
            "(United States, Germany, United Kingdom, France, Japan, China, Canada, Italy, Spain)"
        )
        st.session_state.chat_messages = [{'role': 'bot', 'content': welcome}]
        st.session_state.conversation_history = [{'role': 'assistant', 'content': welcome}]
        st.session_state.quick_replies = COUNTRIES[:5] + ['Germany', 'Japan']
        st.session_state.chat_initialized = True

    # -- Render message history
    msgs_container = st.container()
    with msgs_container:
        for msg in st.session_state.chat_messages:
            if msg['role'] == 'bot':
                with st.chat_message("assistant", avatar="🤖"):
                    st.markdown(msg['content'])
            else:
                with st.chat_message("user", avatar="👤"):
                    st.markdown(msg['content'])

    # -- Quick reply chips (rendered as buttons in a row)
    qr = st.session_state.quick_replies
    if qr:
        qr_cols = st.columns(min(len(qr), 3))
        for i, chip in enumerate(qr[:6]):
            col_idx = i % min(len(qr), 3)
            with qr_cols[col_idx]:
                if st.button(chip, key=f"qr_{i}_{chip[:10]}", use_container_width=True):
                    st.session_state.quick_replies = []
                    handle_chat_message(chip)
                    st.rerun()

    # -- Chat input
    user_input = st.chat_input("Ask me anything…")
    if user_input:
        st.session_state.quick_replies = []
        handle_chat_message(user_input)
        st.rerun()

    # -- Clear button
    if st.button("🗑 Clear Chat", key="btn_clear_chat", use_container_width=True):
        st.session_state.chat_messages = []
        st.session_state.conversation_history = []
        st.session_state.chat_initialized = False
        st.session_state.chat_step = 0
        st.session_state.quick_replies = []
        st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# PROCESS PENDING ACTIONS
# ══════════════════════════════════════════════════════════════════════════════
def process_pending_action() -> None:
    action = st.session_state.get('pending_action')
    if not action:
        return
    st.session_state.pending_action = None

    if action == 'show_parameter_selection':
        if all_fields_filled():
            st.session_state.current_step = 2
            if not st.session_state.get('ai_rec_text'):
                st.session_state.pending_action = 'load_ai_rec'

    elif action == 'load_ai_rec':
        f = st.session_state.form_state
        with st.spinner("Fetching AI parameter recommendation…"):
            rec = call_recommend_api(f['indication'], f['productName'], f['classMoa'], f['country'])
        st.session_state.ai_rec_text = (rec.get('recommendation', '') or '').replace('**', '**')
        st.session_state.ai_rec_params = rec.get('params', [])

    elif action == 'generate_assumptions':
        f = st.session_state.form_state
        sp = st.session_state.selected_parameters
        with st.spinner("🔬 Researching epidemiology & market data…"):
            rd = call_research_api(f['indication'], f['country'], f['classMoa'])
        asmp = build_assumptions(rd, f, sp)
        st.session_state.assumptions = asmp
        st.session_state.current_step = 3
        add_bot_msg(
            f"✅ **Assumptions generated** for **{f['indication']}** in **{f['country']}**!\n\n"
            "Review the values in the table. Type **\"calculate forecast\"** when ready.",
            ["Calculate Forecast", "Edit Assumptions"],
        )

    elif action == 'calculate_forecast':
        asmp = st.session_state.assumptions
        sp   = st.session_state.selected_parameters
        if not asmp:
            st.warning("Please generate assumptions first.")
            return
        with st.spinner("⚙️ Running forecast engine (epidemiology → patient flow → market adoption → revenue)…"):
            time.sleep(0.8)  # brief visual delay to simulate engine running
            fd = run_forecast(asmp, sp)
        st.session_state.forecast_data = fd
        st.session_state.current_step = 4
        add_bot_msg(
            "✅ **Forecast engine complete!**\n\nAll models calculated. Click **\"View Summary & Charts →\"** to see executive insights and charts.",
            ["Show Results"],
        )

    elif action == 'proceed_results':
        if st.session_state.forecast_data:
            st.session_state.current_step = 5
        else:
            st.warning("No forecast data — run the engine first.")

    elif action == 'apply_ai_rec':
        rec_params = st.session_state.get('ai_rec_params')
        f = st.session_state.form_state
        if rec_params:
            st.session_state.selected_parameters['parameters'] = ['population'] + [p for p in rec_params if p != 'population']
            st.session_state.selected_parameters['epidemiology'] = 'incidence' if 'incidence' in rec_params else 'prevalence'
            add_bot_msg(
                f"**AI recommendation applied** for **{f.get('indication', 'your asset')}**.\n\nParameters auto-selected. Ready to generate?",
                ["Generate Assumptions", "Customise Parameters"],
            )
        else:
            add_bot_msg("No AI recommendation available yet. Please use the preset templates.")

    elif action == 'start_over':
        for k in ['form_state', 'assumptions', 'forecast_data', 'ai_rec_text', 'ai_rec_params', 'chat_initialized']:
            if k == 'form_state':
                st.session_state.form_state = {fk: '' for fk in FORM_FIELDS}
            elif k == 'chat_initialized':
                st.session_state.chat_initialized = False
            else:
                st.session_state[k] = {} if k == 'assumptions' else [] if k == 'forecast_data' else None if 'params' in k else ''
        st.session_state.current_step = 1
        st.session_state.chat_step = 0
        st.session_state.selected_parameters = {
            'epidemiology': 'prevalence',
            'parameters': ['population', 'prevalence', 'diagnosisRate', 'treatmentRate',
                           'eligibilityCriteria', 'classShare', 'peakProductShare',
                           'annualCostPerPatient', 'discount'],
        }
        st.session_state.chat_messages = []
        st.session_state.conversation_history = []
        st.session_state.quick_replies = []


# ══════════════════════════════════════════════════════════════════════════════
# MAIN LAYOUT
# ══════════════════════════════════════════════════════════════════════════════
def main() -> None:
    render_sidebar()

    # Top navbar area
    nav_col1, nav_col2 = st.columns([3, 1])
    with nav_col1:
        # Step progress bar
        step_labels = [f"{'✅' if i < st.session_state.current_step else '🔵' if i == st.session_state.current_step else '○'} {STEP_NAMES[i]}"
                       for i in range(1, 6)]
        st.markdown(
            " &nbsp;→&nbsp; ".join(
                f"**{lbl}**" if (i + 1) == st.session_state.current_step else lbl
                for i, lbl in enumerate(step_labels)
            ),
            unsafe_allow_html=True,
        )
    with nav_col2:
        st.markdown(f"**Step {st.session_state.current_step}/5 — {STEP_NAMES[st.session_state.current_step]}**")

    st.divider()

    # Process any pending workflow actions (generates assumptions, runs engine, etc.)
    process_pending_action()

    # Main two-column layout: workspace | chat
    workspace_col, chat_col = st.columns([3, 1], gap="medium")

    with workspace_col:
        step = st.session_state.current_step
        if step == 1:
            render_product_info()
        elif step == 2:
            render_parameter_selection()
        elif step == 3:
            render_assumptions()
        elif step == 4:
            render_forecast_engine()
        elif step == 5:
            render_results()

    with chat_col:
        render_chat_panel()


if __name__ == "__main__":
    main()
