import { weatherCodeToCategory } from './days';
import { normalOf } from './climate';
import type { DayOutlook } from '../types/planner';
import type { ForecastEntry, ForecastMap } from '../types/visitors';
import { toIsoDate } from '../utils/date';
import { isRecord, toNumbers, toStrings } from '../utils/guards';

export const FORECAST_DAYS = 16;

const ENDPOINT =
  'https://api.open-meteo.com/v1/forecast?latitude=35.9433&longitude=136.1889' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo' +
  `&forecast_days=${FORECAST_DAYS}`;

const parseForecast = (payload: unknown): ForecastMap | null => {
  if (!isRecord(payload) || !isRecord(payload['daily'])) return null;
  const daily = payload['daily'];
  const times = toStrings(daily['time']);
  const codes = toNumbers(daily['weather_code']);
  const maxima = toNumbers(daily['temperature_2m_max']);
  const minima = toNumbers(daily['temperature_2m_min']);
  if (!times || !codes || !maxima || !minima) return null;

  const entries = new Map<string, ForecastEntry>();
  times.forEach((iso, index) => {
    const code = codes[index];
    const tempMax = maxima[index];
    const tempMin = minima[index];
    if (code === undefined || tempMax === undefined || tempMin === undefined) return;
    entries.set(iso, {
      category: weatherCodeToCategory(code),
      tempMax: Math.round(tempMax),
      tempMin: Math.round(tempMin),
    });
  });
  return entries.size > 0 ? entries : null;
};

export const fetchForecast = async (): Promise<ForecastMap | null> => {
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return parseForecast(payload);
  } catch {
    return null;
  }
};

const normalOutlook = (date: Date): DayOutlook => {
  const normal = normalOf(date.getMonth() + 1);
  return {
    date,
    source: 'normal',
    category: normal.dominantWeather,
    tempMax: normal.tempMax,
    tempMin: normal.tempMin,
  };
};

export const outlookFor = (date: Date, forecast: ForecastMap | null): DayOutlook => {
  const entry = forecast?.get(toIsoDate(date));
  if (!entry) return normalOutlook(date);
  return { date, source: 'forecast', ...entry };
};

export const buildOutlooks = (
  dates: readonly Date[],
  forecast: ForecastMap | null
): readonly DayOutlook[] => dates.map((date) => outlookFor(date, forecast));
