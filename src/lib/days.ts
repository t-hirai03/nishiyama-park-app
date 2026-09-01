import dailyVisitors from '../data/daily-visitors.json';

const WEATHER_CATEGORIES = ['sunny', 'cloudy', 'rain', 'snow'] as const;
export type WeatherCategory = (typeof WEATHER_CATEGORIES)[number];

export interface DayRecord {
  readonly date: string;
  readonly weekday: string;
  readonly isWeekend: boolean;
  readonly visitors: number;
  readonly weather: string;
  readonly weatherCategory: WeatherCategory;
  readonly hasPrecipitation: boolean;
  readonly tempMax: number;
  readonly tempMin: number;
}

const isWeatherCategory = (value: string): value is WeatherCategory =>
  WEATHER_CATEGORIES.some((category) => category === value);

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

export const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'] as const;

export const isWeekendDate = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

export const monthDayKey = (date: Date) => (date.getMonth() + 1) * 100 + date.getDate();

export const monthDayOf = (record: DayRecord) =>
  Number(record.date.slice(5, 7)) * 100 + Number(record.date.slice(8, 10));

export const formatMonthDay = (key: number) => `${Math.floor(key / 100)}/${key % 100}`;

export const formatDateLabel = (date: Date) =>
  `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABEL[date.getDay()] ?? ''}）`;

export const formatShortDate = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_LABEL[date.getDay()] ?? ''}）`;

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
