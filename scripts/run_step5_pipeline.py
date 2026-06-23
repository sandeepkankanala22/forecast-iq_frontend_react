"""Run Step 5 pipeline: forecast -> Excel agent -> PPTX (uses AWS CLI credential chain)."""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

BASE = os.environ.get("FORECAST_API_BASE", "http://127.0.0.1:8002")
RUN_INPUT = Path(__file__).resolve().parents[1] / "data" / "runs" / "20260623_125353_cc092852" / "user_input.json"
POLL_INTERVAL = 5
AGENT_TIMEOUT = 1800
PPTX_TIMEOUT = 600


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=60) as resp:
        return json.loads(resp.read().decode())


def poll_status(path: str, session_id: str, label: str, timeout: int) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        data = get(f"{path}?session_id={session_id}")
        status = data.get("status")
        print(f"  [{label}] status={status}")
        if status in ("done", "error"):
            return data
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"{label} did not complete within {timeout}s")


def main() -> int:
    if not RUN_INPUT.is_file():
        print(f"Missing sample input: {RUN_INPUT}", file=sys.stderr)
        return 1

    payload = json.loads(RUN_INPUT.read_text(encoding="utf-8"))
    assumptions = payload["assumptions"]
    selected = payload["selected_parameters"]
    product = payload["product_info"]

    print("1/4 POST /api/forecast …")
    forecast = post("/api/forecast", {"assumptions": assumptions, "selected_parameters": selected})
    results = forecast.get("forecast_results") or []
    print(f"     forecast rows: {len(results)}")

    user_input = {
        "product_info": product,
        "selected_parameters": selected,
        "assumptions": assumptions,
        "forecast_results": results,
    }

    print("2/4 POST /api/agent …")
    agent = post("/api/agent", {"user_input": user_input})
    session_id = agent.get("session_id")
    if agent.get("status") != "started" or not session_id:
        print(f"Agent failed to start: {agent}", file=sys.stderr)
        return 1
    print(f"     session_id={session_id}")

    print("3/4 POST /api/pptx …")
    pptx = post("/api/pptx", {"session_id": session_id, "user_input": user_input})
    print(f"     pptx status={pptx.get('status')}")

    print("4/4 Polling agent + PPTX (AWS Bedrock) …")
    agent_final = poll_status("/api/agent/status", session_id, "Excel agent", AGENT_TIMEOUT)
    pptx_final = poll_status("/api/pptx/status", session_id, "PPTX", PPTX_TIMEOUT)

    print("\n=== Step 5 pipeline complete ===")
    print(f"Excel agent: {agent_final.get('status')} workbook={agent_final.get('workbook_path', 'n/a')}")
    print(f"PPTX:        {pptx_final.get('status')}")
    print(f"\nOpen Results in browser: {BASE}/")
    print(f"Excel preview: {BASE}/preview_excel?session_id={session_id}")
    print(f"Download Excel: {BASE}/api/excel?session_id={session_id}")
    print(f"Download PPTX:  {BASE}/api/pptx?session_id={session_id}")
    return 0 if agent_final.get("status") == "done" else 1


if __name__ == "__main__":
    sys.exit(main())
