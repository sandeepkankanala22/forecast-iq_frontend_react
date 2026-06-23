@echo off
uvicorn forecast_server:app --reload --port 8000 ^
  --reload-exclude "data/runs/*/scripts/*.py" ^
  --reload-exclude "data/runs/*/*/*.py" ^
  --reload-exclude "data/runs/*/*.py" ^
  --reload-exclude "data/output/*" ^
  --reload-exclude "data/logs/*"
