import { weatherCodeToCategory, type WeatherCategory } from './congestion';

export interface ForecastDay {
  readonly date: Date;
  readonly category: WeatherCategory;
  readonly tempMax: number;
  readonly tempMin: number;
}

const ENDPOINT =
  'https://api.open-meteo.com/v1/forecast?latitude=35.9433&longitude=136.1889' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=7';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumbers = (value: unknown): readonly number[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'number') ? value : null;

const toStrings = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;

const parseForecast = (payload: unknown): readonly ForecastDay[] | null => {
  if (!isRecord(payload) || !isRecord(payload['daily'])) return null;
  const daily = payload['daily'];

  const times = toStrings(daily['time']);
  const codes = toNumbers(daily['weather_code']);
  const maxima = toNumbers(daily['temperature_2m_max']);
  const minima = toNumbers(daily['temperature_2m_min']);
  if (!times || !codes || !maxima || !minima) return null;

  const days: ForecastDay[] = [];
  for (const [index, iso] of times.entries()) {
    const code = codes[index];
    const tempMax = maxima[index];
    const tempMin = minima[index];
    if (code === undefined || tempMax === undefined || tempMin === undefined) continue;
    days.push({
      date: new Date(`${iso}T00:00:00+09:00`),
      category: weatherCodeToCategory(code),
      tempMax: Math.round(tempMax),
      tempMin: Math.round(tempMin),
    });
  }
  return days.length > 0 ? days : null;
};

export const fetchForecast = async (): Promise<readonly ForecastDay[] | null> => {
  const response = await fetch(ENDPOINT);
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  return parseForecast(payload);
};
