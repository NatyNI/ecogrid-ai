from typing import Literal

from pydantic import BaseModel, Field

Decision = Literal[
    "battery",
    "grid",
    "solar-direct",
    "charge-battery",
    "solar+battery",
    "solar+grid",
]


class WeatherHour(BaseModel):
    hour: int
    cloud_cover: float = Field(alias="cloudCover")
    temperature: float

    model_config = {"populate_by_name": True}


class DailyWeather(BaseModel):
    date: str
    cloud_mean: float = Field(alias="cloudMean")
    t_max: float = Field(alias="tMax")
    t_min: float = Field(alias="tMin")

    model_config = {"populate_by_name": True}


class WeatherResponse(BaseModel):
    city: str
    today: list[WeatherHour]
    tomorrow: list[WeatherHour]
    daily: list[DailyWeather]


class ModelMetrics(BaseModel):
    consumption_mae: float = Field(alias="consumptionMAE")
    solar_mae: float = Field(alias="solarMAE")
    samples: int

    model_config = {"populate_by_name": True}


class HourlyDecision(BaseModel):
    hour: int
    predicted_consumption: float = Field(alias="predictedConsumption")
    predicted_solar: float = Field(alias="predictedSolar")
    decision: Decision
    reason: str
    savings: float
    solar_used: float = Field(alias="solarUsed")
    battery_used: float = Field(alias="batteryUsed")
    grid_used: float = Field(alias="gridUsed")
    battery_after: float = Field(alias="batteryAfter")

    model_config = {"populate_by_name": True}


class DashboardResponse(BaseModel):
    weather: WeatherResponse
    metrics: ModelMetrics
    decisions: list[HourlyDecision]

    model_config = {"populate_by_name": True}
