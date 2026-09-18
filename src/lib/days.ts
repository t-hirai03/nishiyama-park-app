import dailyVisitors from '../data/daily-visitors.json';
import type { DayRecord, WeatherCategory } from '../types/visitors';
import { isOneOf } from '../utils/guards';
import { monthDayKey } from '../utils/date';

export const WEATHER_CATEGORIES: readonly WeatherCategory[] = ['sunny', 'cloudy', 'rain', 'snow'];

const isWeatherCategory = (value: string): value is WeatherCategory =>
  isOneOf(WEATHER_CATEGORIES, value);

const parseDay = (raw: (typeof dailyVisitors.days)[number]): DayRecord | null =>
  isWeatherCategory(raw.weatherCategory) ? { ...raw, weatherCategory: raw.weatherCategory } : null;

export const ALL_DAYS: readonly DayRecord[] = dailyVisitors.days.flatMap(
  (raw) => parseDay(raw) ?? []
);

export const DATA_NOTE = dailyVisitors.note;
export const DATA_FISCAL_YEAR = dailyVisitors.fiscalYear;
export const DATA_AREA = dailyVisitors.area;

export const WEATHER_LABEL: Record<WeatherCategory, string> = {
  sunny: '晴れ',
  cloudy: 'くもり',
  rain: '雨',
  snow: '雪',
};

export const monthDayOf = (record: DayRecord): number =>
  Number(record.date.slice(5, 7)) * 100 + Number(record.date.slice(8, 10));

export const monthOf = (record: DayRecord): number => Number(record.date.slice(5, 7));

const WMO_SUNNY = [0, 1];
const WMO_CLOUDY = [2, 3, 45, 48];
const WMO_SNOW = [71, 73, 75, 77, 85, 86];

export const weatherCodeToCategory = (code: number): WeatherCategory => {
  if (WMO_SUNNY.includes(code)) return 'sunny';
  if (WMO_CLOUDY.includes(code)) return 'cloudy';
  if (WMO_SNOW.includes(code)) return 'snow';
  return 'rain';
};

const sameMonthDay = new Map<number, DayRecord>(
  ALL_DAYS.map((day) => [monthDayOf(day), day] as const)
);

export const lastYearSameDay = (date: Date): DayRecord | undefined =>
  sameMonthDay.get(monthDayKey(date));
