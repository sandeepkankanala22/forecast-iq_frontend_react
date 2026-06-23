"""Verify Download Workbook + Download Presentation endpoints (legacy flow)."""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("FORECAST_API_BASE", "http://127.0.0.1:8002")
RUN_INPUT = Path(__file__).resolve().parents[1] / "data" / "runs" / "20260623_125353_cc092852" / "user_input.json"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "runs" / "_download_test"
PPTX_TIMEOUT = 120
AGENT_TIMEOUT = int(os.environ.get("AGENT_TIMEOUT", "1800"))


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


def get_json(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=60) as resp:
        return json.loads(resp.read().decode())


def download_file(url: str, dest: Path) -> int:
    with urllib.request.urlopen(url, timeout=120) as resp:
        data = resp.read()
        dest.write_bytes(data)
        return len(data)


def poll(path: str, session_id: str, label: str, timeout: int) -> dict:
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = get_json(f"{path}?session_id={session_id}")
        status = last.get("status")
        print(f"  [{label}] {status}")
        if status in ("done", "error"):
            return last
        time.sleep(3)
    raise TimeoutError(f"{label} timed out after {timeout}s (last={last})")


def main() -> int:
    if not RUN_INPUT.is_file():
        print(f"Missing sample: {RUN_INPUT}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.loads(RUN_INPUT.read_text(encoding="utf-8"))

    print(f"API base: {BASE}")
    print("1) POST /api/forecast")
    forecast = post("/api/forecast", {
        "assumptions": payload["assumptions"],
        "selected_parameters": payload["selected_parameters"],
    })
    rows = len(forecast.get("forecast_results") or [])
    print(f"   forecast rows: {rows}")
    if rows == 0:
        print("FAIL: empty forecast", file=sys.stderr)
        return 1

    user_input = {
        "product_info": payload["product_info"],
        "selected_parameters": payload["selected_parameters"],
        "assumptions": payload["assumptions"],
        "forecast_results": forecast["forecast_results"],
    }

    print("2) POST /api/agent + POST /api/pptx (parallel, legacy flow)")
    agent = post("/api/agent", {"user_input": user_input})
    session_id = agent.get("session_id")
    if agent.get("status") != "started" or not session_id:
        print(f"FAIL agent start: {agent}", file=sys.stderr)
        return 1
    print(f"   session_id={session_id}")

    pptx_start = post("/api/pptx", {"session_id": session_id, "user_input": user_input})
    print(f"   pptx started: {pptx_start.get('status')}")

    print(f"3) Poll PPTX (timeout {PPTX_TIMEOUT}s)")
    t0 = time.time()
    pptx_final = poll("/api/pptx/status", session_id, "PPTX", PPTX_TIMEOUT)
    pptx_elapsed = round(time.time() - t0, 1)
    print(f"   PPTX finished in {pptx_elapsed}s -> {pptx_final.get('status')}")
    if pptx_final.get("error"):
        print(f"   PPTX error: {pptx_final['error']}", file=sys.stderr)

    pptx_ok = False
    if pptx_final.get("status") == "done":
        pptx_path = OUT_DIR / f"{session_id}.pptx"
        try:
            nbytes = download_file(f"{BASE}/api/pptx?session_id={session_id}", pptx_path)
            pptx_ok = nbytes > 10_000 and pptx_path.read_bytes()[:2] == b"PK"
            print(f"   Download Presentation: {nbytes:,} bytes -> {pptx_path.name} ({'OK' if pptx_ok else 'BAD'})")
        except urllib.error.HTTPError as exc:
            print(f"   Download Presentation HTTP {exc.code}: {exc.read().decode()[:200]}", file=sys.stderr)
    else:
        print("   Download Presentation: SKIPPED (generation failed)", file=sys.stderr)

    print(f"4) Poll Excel agent (timeout {AGENT_TIMEOUT}s)")
    t1 = time.time()
    agent_final = poll("/api/agent/status", session_id, "Excel agent", AGENT_TIMEOUT)
    agent_elapsed = round(time.time() - t1, 1)
    print(f"   Excel agent finished in {agent_elapsed}s -> {agent_final.get('status')}")

    excel_ok = False
    if agent_final.get("status") == "done":
        xlsx_path = OUT_DIR / f"{session_id}.xlsx"
        try:
            nbytes = download_file(f"{BASE}/api/excel?session_id={session_id}", xlsx_path)
            excel_ok = nbytes > 1000 and xlsx_path.read_bytes()[:2] == b"PK"
            print(f"   Download Workbook: {nbytes:,} bytes -> {xlsx_path.name} ({'OK' if excel_ok else 'BAD'})")
        except urllib.error.HTTPError as exc:
            print(f"   Download Workbook HTTP {exc.code}: {exc.read().decode()[:200]}", file=sys.stderr)
    else:
        err = agent_final.get("error") or agent_final.get("message") or "unknown"
        print(f"   Download Workbook: SKIPPED (agent {agent_final.get('status')}: {err})", file=sys.stderr)

    print("\n=== Summary (legacy-equivalent endpoints) ===")
    print(f"  Presentation: {'PASS' if pptx_ok else 'FAIL'}  ({pptx_elapsed}s)")
    print(f"  Workbook:     {'PASS' if excel_ok else 'FAIL/PENDING'}  ({agent_elapsed}s)")
    print(f"  Session:      {session_id}")
    print(f"  UI:           {BASE}/")
    print(f"  Excel preview:{BASE}/preview_excel?session_id={session_id}")

    if pptx_ok and excel_ok:
        return 0
    if pptx_ok:
        return 2  # pptx ok, excel still running or failed
    return 1


if __name__ == "__main__":
    sys.exit(main())
