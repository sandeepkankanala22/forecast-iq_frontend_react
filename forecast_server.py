"""
forecast_server.py — thin entrypoint (Dockerfile / AppRunner / uvicorn compatibility)

Run:
    uvicorn forecast_server:app --reload --port 8000

All application logic lives in backend/server.py.
"""

import multiprocessing
multiprocessing.freeze_support()

from backend.server import app  # noqa: F401 — re-exported for uvicorn
