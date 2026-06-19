from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.energy_ml import build_dashboard_decisions
from app.schemas import DashboardResponse, WeatherResponse
from app.weather import fetch_weather_forecast

app = FastAPI(
    title="EcoGrid AI API",
    description="Python backend for smart renewable energy management with Random Forest ML.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ecogrid-api"}


@app.get("/api/weather", response_model=WeatherResponse, response_model_by_alias=True)
async def get_weather(
    lat: float = Query(44.4268, ge=-90, le=90),
    lon: float = Query(26.1025, ge=-180, le=180),
) -> WeatherResponse:
    try:
        return await fetch_weather_forecast(lat=lat, lon=lon)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Weather API error: {exc}") from exc


@app.get("/api/dashboard", response_model=DashboardResponse, response_model_by_alias=True)
async def get_dashboard(
    lat: float = Query(44.4268, ge=-90, le=90),
    lon: float = Query(26.1025, ge=-180, le=180),
) -> DashboardResponse:
    try:
        weather = await fetch_weather_forecast(lat=lat, lon=lon)
        metrics, decisions = build_dashboard_decisions(weather.today)
        return DashboardResponse(
            weather=weather,
            metrics=metrics,
            decisions=decisions,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
