"""
Project configuration — single source for paths and env.
Load .env from project root. Paths resolve relative to project root.
When S3_BUCKET is set, outputs and logs go to S3; local dirs still exist for staging.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = lambda _: None

# Project root = directory containing this file
PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

# Paths (from .env or defaults)
def _path(key: str, default: str) -> Path:
    val = os.getenv(key, default)
    p = Path(val)
    return (PROJECT_ROOT / val).resolve() if not p.is_absolute() else p

PROMPTS_DIR = _path("PROMPTS_DIR", "agents/excel_agent/prompts")
OUTPUT_DIR = _path("OUTPUT_DIR", "data/output")
LOGS_DIR = _path("LOGS_DIR", "data/logs")
RUNS_DIR = _path("RUNS_DIR", "data/runs")  # Per-run dirs: logs + user_input + outputs + scripts

# Ensure dirs exist (used for local staging even when S3 is enabled)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
RUNS_DIR.mkdir(parents=True, exist_ok=True)

# S3 config (optional) - when S3_BUCKET is set, outputs/logs are written to S3
# Env keys: S3_BUCKET, S3_PREFIX, S3_REGION (or AWS_REGION)
