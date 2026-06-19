from app.energy_ml import EnergyForecastModel, generate_historical_data, optimize_day
from app.schemas import WeatherHour


def test_generate_historical_data_shape():
    data = generate_historical_data(days=2)
    assert len(data) == 48
    assert 0 <= data[0].hour <= 23


def test_model_trains_and_predicts():
    data = generate_historical_data(days=10)
    model = EnergyForecastModel()
    model.train(data)
    assert model.trained
    assert model.metrics.samples == 240

    forecast = [
        WeatherHour(hour=h, cloudCover=30.0, temperature=20.0)
        for h in range(24)
    ]
    predictions = model.predict_day(forecast)
    assert len(predictions) == 24
    assert predictions[0]["predictedConsumption"] >= 0


def test_optimize_day_returns_24_decisions():
    predictions = [
        {
            "hour": h,
            "predictedConsumption": 1.0,
            "predictedSolar": 0.5 if 8 <= h <= 18 else 0.0,
        }
        for h in range(24)
    ]
    decisions = optimize_day(predictions)
    assert len(decisions) == 24
    assert decisions[0].decision in {
        "battery",
        "grid",
        "solar-direct",
        "charge-battery",
        "solar+battery",
        "solar+grid",
    }
