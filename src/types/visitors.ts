export type WeatherCategory = 'sunny' | 'cloudy' | 'rain' | 'snow';

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

export interface WeatherStat {
  readonly category: WeatherCategory;
  readonly label: string;
  readonly holiday: { readonly average: number; readonly days: number };
  readonly weekday: { readonly average: number; readonly days: number };
}

export interface TemperatureBand {
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly midpoint: number;
  readonly average: number;
  readonly days: number;
}

export interface MonthlyNormal {
  readonly month: number;
  readonly averageVisitors: number;
  readonly tempMax: number;
  readonly tempMin: number;
  readonly weatherShare: Record<WeatherCategory, number>;
  readonly dominantWeather: WeatherCategory;
}

export interface BloomWindow {
  readonly id: string;
  readonly name: string;
  readonly peakKey: number;
  readonly fromKey: number;
  readonly toKey: number;
  readonly peakVisitors: number;
  readonly lengthDays: number;
}

export interface MonthTrend {
  readonly month: string;
  readonly early: number;
  readonly late: number;
  /** 前期比の変化率。0.64 なら +64% */
  readonly change: number;
  readonly sampleYears: number;
}

export interface ForecastEntry {
  readonly category: WeatherCategory;
  readonly tempMax: number;
  readonly tempMin: number;
}

export type ForecastMap = ReadonlyMap<string, ForecastEntry>;

/** 月別集計のJSON。values は years と同じ並び（新しい年度が先頭）で、欠測は null */
export interface MonthlySeries {
  readonly label: string;
  readonly years: readonly string[];
  readonly months: readonly { readonly month: string; readonly values: readonly (number | null)[] }[];
}
