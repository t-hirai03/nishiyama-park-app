import { ALL_DAYS, WEATHER_LABEL, type DayRecord, type WeatherCategory } from './days';

const WEATHER_CATEGORIES: readonly WeatherCategory[] = ['sunny', 'cloudy', 'rain', 'snow'];

const average = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const roundedAverage = (values: readonly number[]) => Math.round(average(values));

export interface WeatherStat {
  readonly category: WeatherCategory;
  readonly label: string;
  readonly holiday: { readonly average: number; readonly days: number };
  readonly weekday: { readonly average: number; readonly days: number };
}

const cellOf = (category: WeatherCategory, isWeekend: boolean) => {
  const days = ALL_DAYS.filter(
    (day) => day.weatherCategory === category && day.isWeekend === isWeekend
  );
  return { average: roundedAverage(days.map((day) => day.visitors)), days: days.length };
};

export const WEATHER_STATS: readonly WeatherStat[] = WEATHER_CATEGORIES.map((category) => ({
  category,
  label: WEATHER_LABEL[category],
  holiday: cellOf(category, true),
  weekday: cellOf(category, false),
}));

const bestHoliday = Math.max(...WEATHER_STATS.map((stat) => stat.holiday.average));
const bestWeekday = Math.max(...WEATHER_STATS.map((stat) => stat.weekday.average));

const statOf = (category: WeatherCategory) =>
  WEATHER_STATS.find((stat) => stat.category === category);

export const weatherRatio = (category: WeatherCategory, isWeekend: boolean): number => {
  const stat = statOf(category);
  if (!stat) return 0;
  return isWeekend ? stat.holiday.average / bestHoliday : stat.weekday.average / bestWeekday;
};

export interface TemperatureBand {
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly midpoint: number;
  readonly average: number;
  readonly days: number;
}

const BAND_EDGES = [-Infinity, 5, 10, 15, 20, 25, 30, Infinity];

const bandLabel = (from: number, to: number) => {
  if (!Number.isFinite(from)) return `${to}℃未満`;
  if (!Number.isFinite(to)) return `${from}℃以上`;
  return `${from}〜${to}℃`;
};

export const TEMPERATURE_BANDS: readonly TemperatureBand[] = BAND_EDGES.slice(0, -1).map(
  (from, index) => {
    const to = BAND_EDGES[index + 1] ?? Infinity;
    const days = ALL_DAYS.filter((day) => day.tempMax >= from && day.tempMax < to);
    const finiteFrom = Number.isFinite(from) ? from : to - 5;
    const finiteTo = Number.isFinite(to) ? to : from + 5;
    return {
      label: bandLabel(from, to),
      from,
      to,
      midpoint: (finiteFrom + finiteTo) / 2,
      average: roundedAverage(days.map((day) => day.visitors)),
      days: days.length,
    };
  }
);

export const TEMPERATURE_PEAK = Math.max(...TEMPERATURE_BANDS.map((band) => band.average));

export const temperatureRatio = (tempMax: number): number => {
  const points = TEMPERATURE_BANDS.map((band) => ({ x: band.midpoint, y: band.average }));
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (tempMax <= first.x) return first.y / TEMPERATURE_PEAK;
  if (tempMax >= last.x) return last.y / TEMPERATURE_PEAK;
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (!left || !right || tempMax > right.x) continue;
    const weight = (tempMax - left.x) / (right.x - left.x);
    return (left.y + (right.y - left.y) * weight) / TEMPERATURE_PEAK;
  }
  return last.y / TEMPERATURE_PEAK;
};

export const temperatureBandOf = (tempMax: number): TemperatureBand | undefined =>
  TEMPERATURE_BANDS.find((band) => tempMax >= band.from && tempMax < band.to);

export interface MonthlyNormal {
  readonly month: number;
  readonly averageVisitors: number;
  readonly tempMax: number;
  readonly tempMin: number;
  readonly weatherShare: Record<WeatherCategory, number>;
  readonly dominantWeather: WeatherCategory;
}

const monthOf = (day: DayRecord) => Number(day.date.slice(5, 7));

export const MONTHLY_NORMALS: readonly MonthlyNormal[] = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const days = ALL_DAYS.filter((day) => monthOf(day) === month);
  const shareEntries = WEATHER_CATEGORIES.map(
    (category) =>
      [
        category,
        days.filter((day) => day.weatherCategory === category).length / Math.max(days.length, 1),
      ] as const
  );
  const weatherShare = Object.fromEntries(shareEntries) as Record<WeatherCategory, number>;
  const dominant = [...shareEntries].sort((a, b) => b[1] - a[1])[0];
  return {
    month,
    averageVisitors: roundedAverage(days.map((day) => day.visitors)),
    tempMax: roundedAverage(days.map((day) => day.tempMax)),
    tempMin: roundedAverage(days.map((day) => day.tempMin)),
    weatherShare,
    dominantWeather: dominant?.[0] ?? 'cloudy',
  };
});

export const normalOf = (month: number): MonthlyNormal =>
  MONTHLY_NORMALS[month - 1] ?? (MONTHLY_NORMALS[0] as MonthlyNormal);

export const expectedWeatherRatio = (month: number, isWeekend: boolean): number => {
  const normal = normalOf(month);
  return WEATHER_CATEGORIES.reduce(
    (total, category) => total + normal.weatherShare[category] * weatherRatio(category, isWeekend),
    0
  );
};
