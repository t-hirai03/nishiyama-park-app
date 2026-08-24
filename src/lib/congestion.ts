import dailyVisitors from '../data/daily-visitors.json';

const WEATHER_CATEGORIES = ['sunny', 'cloudy', 'rain', 'snow'] as const;
export type WeatherCategory = (typeof WEATHER_CATEGORIES)[number];

const CONGESTION_LEVELS = ['quiet', 'normal', 'busy', 'crowded'] as const;
export type CongestionLevel = (typeof CONGESTION_LEVELS)[number];

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

export interface Condition {
  readonly month: number;
  readonly weatherCategory: WeatherCategory;
  readonly tempMax: number;
  readonly isWeekend: boolean;
}

export interface Prediction {
  readonly level: CongestionLevel;
  readonly median: number;
  readonly min: number;
  readonly max: number;
  readonly samples: readonly DayRecord[];
  readonly criteria: string;
  readonly percentile: number;
}

const isWeatherCategory = (value: string): value is WeatherCategory =>
  WEATHER_CATEGORIES.some((category) => category === value);

const parseDay = (raw: (typeof dailyVisitors.days)[number]): DayRecord | null => {
  if (!isWeatherCategory(raw.weatherCategory)) return null;
  return { ...raw, weatherCategory: raw.weatherCategory };
};

export const ALL_DAYS: readonly DayRecord[] = dailyVisitors.days.flatMap(
  (raw) => parseDay(raw) ?? []
);

export const DATA_NOTE = dailyVisitors.note;
export const DATA_FISCAL_YEAR = dailyVisitors.fiscalYear;

export const WEATHER_LABEL: Record<WeatherCategory, string> = {
  sunny: '晴れ',
  cloudy: 'くもり',
  rain: '雨',
  snow: '雪',
};

export const LEVEL_LABEL: Record<CongestionLevel, string> = {
  quiet: 'ゆったり',
  normal: 'ふつう',
  busy: 'にぎわう',
  crowded: 'かなり混む',
};

const monthOf = (date: string) => Number(date.slice(5, 7));

const monthDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  if (sorted.length % 2 !== 0) return upper;
  const lower = sorted[mid - 1] ?? upper;
  return Math.round((lower + upper) / 2);
};

const percentileOf = (value: number) => {
  const below = ALL_DAYS.filter((day) => day.visitors < value).length;
  return Math.round((below / ALL_DAYS.length) * 100);
};

interface Tier {
  readonly criteria: string;
  readonly match: (day: DayRecord, condition: Condition) => boolean;
}

const sameWeather = (day: DayRecord, c: Condition) => day.weatherCategory === c.weatherCategory;
const sameDayType = (day: DayRecord, c: Condition) => day.isWeekend === c.isWeekend;
const nearMonth = (day: DayRecord, c: Condition) => monthDistance(monthOf(day.date), c.month) <= 1;
const nearTemp = (day: DayRecord, c: Condition, tolerance: number) =>
  Math.abs(day.tempMax - c.tempMax) <= tolerance;

const TIERS: readonly Tier[] = [
  {
    criteria: '同じ天気・最高気温±3℃・同じ平日休日・前後1か月',
    match: (day, c) =>
      sameWeather(day, c) && nearTemp(day, c, 3) && sameDayType(day, c) && nearMonth(day, c),
  },
  {
    criteria: '同じ天気・最高気温±5℃・同じ平日休日・前後1か月',
    match: (day, c) =>
      sameWeather(day, c) && nearTemp(day, c, 5) && sameDayType(day, c) && nearMonth(day, c),
  },
  {
    criteria: '同じ天気・同じ平日休日・前後1か月',
    match: (day, c) => sameWeather(day, c) && sameDayType(day, c) && nearMonth(day, c),
  },
  {
    criteria: '同じ天気・最高気温±5℃・同じ平日休日',
    match: (day, c) => sameWeather(day, c) && nearTemp(day, c, 5) && sameDayType(day, c),
  },
  {
    criteria: '同じ天気・同じ平日休日（通年）',
    match: (day, c) => sameWeather(day, c) && sameDayType(day, c),
  },
  {
    criteria: '同じ天気・前後1か月',
    match: (day, c) => sameWeather(day, c) && nearMonth(day, c),
  },
  {
    criteria: '同じ天気（通年）',
    match: (day, c) => sameWeather(day, c),
  },
];

const MIN_SAMPLES = 4;

const levelOf = (percentile: number): CongestionLevel => {
  if (percentile < 25) return 'quiet';
  if (percentile < 60) return 'normal';
  if (percentile < 85) return 'busy';
  return 'crowded';
};

const FALLBACK_TIER: Tier = {
  criteria: '同じ天気（通年）',
  match: sameWeather,
};

export const predict = (condition: Condition): Prediction => {
  const tier =
    TIERS.find((candidate) => ALL_DAYS.filter((day) => candidate.match(day, condition)).length >= MIN_SAMPLES) ??
    TIERS[TIERS.length - 1] ??
    FALLBACK_TIER;

  const samples = ALL_DAYS.filter((day) => tier.match(day, condition));
  const visitors = samples.map((day) => day.visitors);
  const value = median(visitors);
  const percentile = percentileOf(value);

  return {
    level: levelOf(percentile),
    median: value,
    min: Math.min(...visitors),
    max: Math.max(...visitors),
    samples: [...samples].sort((a, b) => b.visitors - a.visitors),
    criteria: tier.criteria,
    percentile,
  };
};

const WMO_SUNNY = [0, 1];
const WMO_CLOUDY = [2, 3, 45, 48];
const WMO_SNOW = [71, 73, 75, 77, 85, 86];

export const weatherCodeToCategory = (code: number): WeatherCategory => {
  if (WMO_SUNNY.includes(code)) return 'sunny';
  if (WMO_CLOUDY.includes(code)) return 'cloudy';
  if (WMO_SNOW.includes(code)) return 'snow';
  return 'rain';
};
