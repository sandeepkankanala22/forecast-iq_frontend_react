# ForecastIQ — React Frontend + FastAPI Backend

Commercial patient-based pharmaceutical forecasting platform with AI copilot, Excel workbook generation, and presentation export.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Backend:** FastAPI (`backend/server.py`, entrypoint `forecast_server.py`)
- **Agents:** Excel + PPTX generation via LangGraph / Bedrock

## Quick start

### Backend

```bash
pip install -r requirements.txt
uvicorn forecast_server:app --reload --port 8000
```

### Frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` (API proxied to `:8000`).

### Production build

```bash
cd frontend && npm run build
uvicorn forecast_server:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`.

## Routes

| URL | Page |
|-----|------|
| `/` | Main forecast app |
| `/prompt-editor` | Prompt Studio |
| `/preview_excel` | Excel viewer |

## Environment

Copy `.env.example` to `.env` and configure AWS/Bedrock credentials for AI features.

Legacy HTML UI is archived in `frontend-legacy/`.
