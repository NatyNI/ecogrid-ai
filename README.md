# EcoGrid AI — Python + React

Smart renewable energy management dashboard with a **FastAPI** backend (scikit-learn ML) and a **React** frontend.

## Structure

```
ecogrid-ai/
├── backend/     # FastAPI + Random Forest + Open-Meteo
├── frontend/    # React + Vite + Recharts dashboard
├── setup.sh     # One-time dependency install
└── start.sh     # Run backend + frontend
```

## Quick start

**One-time setup:**

```bash
cd ecogrid-ai
bash setup.sh
```

**Start the app:**

```bash
bash start.sh
```

- Dashboard: http://127.0.0.1:5173
- API docs: http://127.0.0.1:8000/docs
- Press `Ctrl+C` to stop both servers

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/weather` | Open-Meteo forecast proxy |
| `GET /api/dashboard` | Today's ML predictions and system decisions |

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Stack

- **Backend:** Python, FastAPI, scikit-learn, httpx, Pydantic
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Data:** Synthetic training data + live Open-Meteo weather

