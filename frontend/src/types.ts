export type Decision =
  | "battery"
  | "grid"
  | "solar-direct"
  | "charge-battery"
  | "solar+battery"
  | "solar+grid";

export type WeatherHour = {
  hour: number;
  cloudCover: number;
  temperature: number;
};

export type DailyWeather = {
  date: string;
  cloudMean: number;
  tMax: number;
  tMin: number;
};

export type WeatherResponse = {
  city: string;
  today: WeatherHour[];
  tomorrow: WeatherHour[];
  daily: DailyWeather[];
};

export type ModelMetrics = {
  consumptionMAE: number;
  solarMAE: number;
  samples: number;
};

export type HourlyDecision = {
  hour: number;
  predictedConsumption: number;
  predictedSolar: number;
  decision: Decision;
  reason: string;
  savings: number;
  solarUsed: number;
  batteryUsed: number;
  gridUsed: number;
  batteryAfter: number;
};

export type DashboardResponse = {
  weather: WeatherResponse;
  metrics: ModelMetrics;
  decisions: HourlyDecision[];
};
