from __future__ import annotations

import math
import random
from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import RandomForestRegressor

from app.schemas import HourlyDecision, ModelMetrics, WeatherHour

Decision = HourlyDecision.model_fields["decision"].annotation  # type: ignore[assignment]


@dataclass
class HourlyData:
    hour: int
    consumption: float
    solar_production: float
    cloud_cover: float
    temperature: float
    battery_level: float


def generate_historical_data(days: int = 30) -> list[HourlyData]:
    random.seed(42)
    np.random.seed(42)
    data: list[HourlyData] = []

    for _ in range(days):
        day_cloud = random.random() * 100
        for hour in range(24):
            if 7 <= hour <= 9:
                base = 1.8 + random.random() * 0.6
            elif 18 <= hour <= 22:
                base = 2.2 + random.random() * 0.8
            elif 10 <= hour <= 17:
                base = 0.9 + random.random() * 0.4
            else:
                base = 0.3 + random.random() * 0.2

            sun = (
                max(0.0, math.sin(((hour - 6) / 14) * math.pi))
                if 6 <= hour <= 20
                else 0.0
            )
            solar = sun * 4 * (1 - day_cloud / 130) * (0.85 + random.random() * 0.3)

            data.append(
                HourlyData(
                    hour=hour,
                    consumption=round(base, 3),
                    solar_production=round(solar, 3),
                    cloud_cover=round(day_cloud),
                    temperature=15
                    + math.sin((hour / 24) * math.pi * 2 - 1.5) * 8
                    + (random.random() * 4 - 2),
                    battery_level=50,
                )
            )

    return data


def _features(rows: list[HourlyData] | list[WeatherHour]) -> np.ndarray:
    matrix = []
    for row in rows:
        hour = row.hour if isinstance(row, HourlyData) else row.hour
        cloud = row.cloud_cover if isinstance(row, HourlyData) else row.cloud_cover
        temp = row.temperature if isinstance(row, HourlyData) else row.temperature
        matrix.append(
            [
                hour,
                cloud,
                temp,
                math.sin((hour / 24) * 2 * math.pi),
                math.cos((hour / 24) * 2 * math.pi),
            ]
        )
    return np.array(matrix, dtype=float)


class EnergyForecastModel:
    def __init__(self) -> None:
        self.consumption_model: RandomForestRegressor | None = None
        self.solar_model: RandomForestRegressor | None = None
        self.trained = False
        self.metrics = ModelMetrics(consumptionMAE=0, solarMAE=0, samples=0)

    def train(self, data: list[HourlyData]) -> None:
        features = _features(data)
        consumption = np.array([row.consumption for row in data], dtype=float)
        solar = np.array([row.solar_production for row in data], dtype=float)

        options = {
            "n_estimators": 50,
            "max_features": 0.8,
            "bootstrap": True,
            "random_state": 42,
        }

        self.consumption_model = RandomForestRegressor(**options)
        self.consumption_model.fit(features, consumption)

        self.solar_model = RandomForestRegressor(**options)
        self.solar_model.fit(features, solar)

        test = data[-48:]
        test_x = _features(test)
        pred_c = self.consumption_model.predict(test_x)
        pred_s = self.solar_model.predict(test_x)

        self.metrics = ModelMetrics(
            consumptionMAE=float(np.mean(np.abs(pred_c - np.array([row.consumption for row in test])))),
            solarMAE=float(np.mean(np.abs(pred_s - np.array([row.solar_production for row in test])))),
            samples=len(data),
        )
        self.trained = True

    def predict_day(self, forecast: list[WeatherHour]) -> list[dict[str, float | int]]:
        if not self.consumption_model or not self.solar_model:
            raise RuntimeError("Model not trained")

        features = _features(forecast)
        consumption = self.consumption_model.predict(features)
        solar = self.solar_model.predict(features)

        predictions: list[dict[str, float | int]] = []
        for index, hour_data in enumerate(forecast):
            is_daylight = 6 <= hour_data.hour <= 20
            raw_solar = max(0.0, round(float(solar[index]), 3))
            predictions.append(
                {
                    "hour": hour_data.hour,
                    "predictedConsumption": max(0.0, round(float(consumption[index]), 3)),
                    "predictedSolar": raw_solar if is_daylight else 0.0,
                }
            )
        return predictions


def optimize_day(
    predictions: list[dict[str, float | int]],
    battery_capacity: float = 10.0,
    initial_battery: float = 4.0,
    min_reserve: float = 1.5,
) -> list[HourlyDecision]:
    total_solar = sum(float(item["predictedSolar"]) for item in predictions)
    sunny_day = total_solar > 12
    battery = initial_battery
    decisions: list[HourlyDecision] = []

    for item in predictions:
        hour = int(item["hour"])
        predicted_consumption = float(item["predictedConsumption"])
        predicted_solar = float(item["predictedSolar"])

        evening_peak = 18 <= hour <= 22
        morning_peak = 7 <= hour <= 9
        peak = evening_peak or morning_peak
        has_solar = predicted_solar > 0.2
        surplus = predicted_solar - predicted_consumption

        decision: Decision = "grid"
        reason = "Grid consumption"
        savings = 0.0
        solar_used = 0.0
        battery_used = 0.0
        grid_used = 0.0

        if has_solar and surplus > 0:
            solar_used = predicted_consumption
            to_battery = min(surplus, battery_capacity - battery)
            battery = min(battery_capacity, battery + to_battery)
            decision = "charge-battery"
            reason = (
                f"Solar covers consumption, surplus {surplus:.2f} kWh -> battery"
            )
            savings = predicted_consumption
        elif has_solar:
            solar_used = predicted_solar
            deficit = predicted_consumption - predicted_solar
            battery_available = battery - min_reserve
            use_battery = battery_available > 0 and (peak or not sunny_day)

            if use_battery and battery_available > 0:
                battery_used = min(deficit, battery_available)
                battery -= battery_used
                remaining = deficit - battery_used
                if remaining > 0.01:
                    grid_used = remaining
                    decision = "solar+battery"
                    reason = (
                        f"{predicted_solar:.2f} kWh solar + {battery_used:.2f} kWh battery + "
                        f"{remaining:.2f} kWh grid"
                    )
                else:
                    decision = "solar+battery"
                    reason = (
                        f"{predicted_solar:.2f} kWh solar + {battery_used:.2f} kWh battery "
                        "cover consumption"
                    )
                savings = solar_used + battery_used
            else:
                grid_used = deficit
                decision = "solar+grid"
                reason = (
                    f"{predicted_solar:.2f} kWh solar + {deficit:.2f} kWh grid "
                    "(battery reserved)"
                )
                savings = solar_used
        elif peak and battery > min_reserve and (sunny_day or evening_peak):
            used = min(predicted_consumption, battery - min_reserve)
            battery -= used
            battery_used = used
            remaining = predicted_consumption - used
            if remaining > 0.01:
                grid_used = remaining
                decision = "battery"
                reason = f"{used:.2f} kWh battery + {remaining:.2f} kWh grid"
            else:
                decision = "battery"
                reason = (
                    "Sunny day -> battery handles peak"
                    if sunny_day
                    else "Evening peak -> battery handles consumption"
                )
            savings = used
        else:
            decision = "grid"
            grid_used = predicted_consumption
            reason = (
                "Battery below reserve -> grid"
                if battery <= min_reserve
                else "Battery reserved for upcoming peak"
            )

        decisions.append(
            HourlyDecision(
                hour=hour,
                predictedConsumption=predicted_consumption,
                predictedSolar=predicted_solar,
                decision=decision,
                reason=reason,
                savings=round(savings, 3),
                solarUsed=round(solar_used, 3),
                batteryUsed=round(battery_used, 3),
                gridUsed=round(grid_used, 3),
                batteryAfter=round(battery, 3),
            )
        )

    return decisions


def build_dashboard_decisions(
    weather_today: list[WeatherHour],
) -> tuple[ModelMetrics, list[HourlyDecision]]:
    historical = generate_historical_data(30)
    model = EnergyForecastModel()
    model.train(historical)

    predictions_today = model.predict_day(weather_today)
    decisions = optimize_day(predictions_today)

    return model.metrics, decisions
