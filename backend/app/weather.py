import httpx

from app.schemas import DailyWeather, WeatherHour, WeatherResponse

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather_forecast(
    lat: float = 44.4268,
    lon: float = 26.1025,
) -> WeatherResponse:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,cloudcover",
        "daily": "temperature_2m_max,temperature_2m_min,cloudcover_mean",
        "timezone": "auto",
        "forecast_days": 3,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    def build_day(offset: int) -> list[WeatherHour]:
        base = offset * 24
        hours: list[WeatherHour] = []
        for hour in range(24):
            hours.append(
                WeatherHour(
                    hour=hour,
                    cloudCover=payload["hourly"]["cloudcover"][base + hour] or 50,
                    temperature=payload["hourly"]["temperature_2m"][base + hour] or 18,
                )
            )
        return hours

    daily = [
        DailyWeather(
            date=date,
            cloudMean=payload["daily"]["cloudcover_mean"][index],
            tMax=payload["daily"]["temperature_2m_max"][index],
            tMin=payload["daily"]["temperature_2m_min"][index],
        )
        for index, date in enumerate(payload["daily"]["time"])
    ]

    return WeatherResponse(
        city="Bucharest",
        today=build_day(0),
        tomorrow=build_day(1),
        daily=daily,
    )
