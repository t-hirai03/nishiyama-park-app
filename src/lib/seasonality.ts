import {
  ALL_DAYS,
  monthDayKey,
  monthDayOf,
  type DayRecord,
  type WeatherCategory,
} from './days';

const SMOOTH_HALF_WIDTH = 5;
const FIT_ITERATIONS = 40;
const PEAK_SEARCH_RADIUS = 18;
const PEAK_MIN_PROMINENCE = 0.2;
const WINDOW_THRESHOLD = 0.5;

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const N = ALL_DAYS.length;

// 来訪者数0の日があると乗法モデルが発散するため、丸め単位の10人を下限に置く
const observed = ALL_DAYS.map((day) => Math.max(day.visitors, 10));

const weekdayIndexOf = (day: DayRecord) => new Date(`${day.date}T00:00:00+09:00`).getDay();
const weekdayIndices = ALL_DAYS.map(weekdayIndexOf);

const smoothCyclic = (series: readonly number[], halfWidth: number) =>
  series.map((_, index) => {
    const window: number[] = [];
    for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
      window.push(series[(index + offset + N * 2) % N] ?? 0);
    }
    return mean(window);
  });

const normalized = <K extends string | number>(factors: Map<K, number>) => {
  const scale = mean([...factors.values()]);
  return new Map([...factors].map(([key, value]) => [key, value / scale] as const));
};

const groupMean = <K extends string | number>(keys: readonly K[], values: readonly number[]) => {
  const groups = new Map<K, number[]>();
  keys.forEach((key, index) => {
    const bucket = groups.get(key) ?? [];
    bucket.push(values[index] ?? 0);
    groups.set(key, bucket);
  });
  return normalized(new Map([...groups].map(([key, bucket]) => [key, mean(bucket)] as const)));
};

const decompose = () => {
  let seasonal = smoothCyclic(observed, SMOOTH_HALF_WIDTH);
  let weekday = new Map<number, number>();
  let weather = new Map<WeatherCategory, number>();

  for (let iteration = 0; iteration < FIT_ITERATIONS; iteration += 1) {
    weekday = groupMean(
      weekdayIndices,
      ALL_DAYS.map(
        (day, index) =>
          (observed[index] ?? 0) /
          ((seasonal[index] ?? 1) * (weather.get(day.weatherCategory) ?? 1))
      )
    );
    weather = groupMean(
      ALL_DAYS.map((day) => day.weatherCategory),
      ALL_DAYS.map(
        (_, index) =>
          (observed[index] ?? 0) /
          ((seasonal[index] ?? 1) * (weekday.get(weekdayIndices[index] ?? 0) ?? 1))
      )
    );
    seasonal = smoothCyclic(
      ALL_DAYS.map(
        (day, index) =>
          (observed[index] ?? 0) /
          ((weekday.get(weekdayIndices[index] ?? 0) ?? 1) * (weather.get(day.weatherCategory) ?? 1))
      ),
      SMOOTH_HALF_WIDTH
    );
  }

  return { seasonal, weekday, weather };
};

const fitted = decompose();

export const WEEKDAY_FACTOR: readonly number[] = Array.from(
  { length: 7 },
  (_, index) => fitted.weekday.get(index) ?? 1
);

export const WEATHER_FACTOR: Record<WeatherCategory, number> = {
  sunny: fitted.weather.get('sunny') ?? 1,
  cloudy: fitted.weather.get('cloudy') ?? 1,
  rain: fitted.weather.get('rain') ?? 1,
  snow: fitted.weather.get('snow') ?? 1,
};

const seasonal = fitted.seasonal;

const sortedSeasonal = [...seasonal].sort((a, b) => a - b);
export const SEASONAL_BASELINE = sortedSeasonal[Math.floor(N / 2)] ?? 0;
export const SEASONAL_MAX = Math.max(...seasonal);

const excessAt = (index: number) => Math.max((seasonal[index] ?? 0) - SEASONAL_BASELINE, 0);

const isLocalMax = (index: number) => {
  for (let offset = -PEAK_SEARCH_RADIUS; offset <= PEAK_SEARCH_RADIUS; offset += 1) {
    if ((seasonal[(index + offset + N * 2) % N] ?? 0) > (seasonal[index] ?? 0)) return false;
  }
  return true;
};

const detectPeaks = () => {
  const threshold = (SEASONAL_MAX - SEASONAL_BASELINE) * PEAK_MIN_PROMINENCE;
  const found: number[] = [];
  for (let index = 0; index < N; index += 1) {
    if (!isLocalMax(index) || excessAt(index) < threshold) continue;
    const previous = found[found.length - 1];
    if (previous !== undefined && index - previous <= PEAK_SEARCH_RADIUS) continue;
    found.push(index);
  }
  return found;
};

export interface BloomWindow {
  readonly id: string;
  readonly name: string;
  readonly peakKey: number;
  readonly fromKey: number;
  readonly toKey: number;
  readonly peakVisitors: number;
  readonly lengthDays: number;
}

const NAMED_PEAKS: readonly { readonly months: readonly number[]; readonly id: string; readonly name: string }[] = [
  { months: [3, 4], id: 'sakura', name: '桜' },
  { months: [5], id: 'tsutsuji', name: 'ツツジ' },
  { months: [10, 11, 12], id: 'kouyou', name: '紅葉' },
];

const nameOf = (monthDay: number) => {
  const month = Math.floor(monthDay / 100);
  return (
    NAMED_PEAKS.find((candidate) => candidate.months.includes(month)) ?? {
      id: `peak-${monthDay}`,
      name: '見頃',
    }
  );
};

const buildWindow = (peakIndex: number): BloomWindow => {
  const threshold = SEASONAL_BASELINE + excessAt(peakIndex) * WINDOW_THRESHOLD;
  let from = peakIndex;
  let to = peakIndex;
  while ((seasonal[(from - 1 + N) % N] ?? 0) >= threshold && (peakIndex - from + N) % N < N / 3) {
    from = (from - 1 + N) % N;
  }
  while ((seasonal[(to + 1) % N] ?? 0) >= threshold && (to - peakIndex + N) % N < N / 3) {
    to = (to + 1) % N;
  }
  const peakKey = monthDayOf(ALL_DAYS[peakIndex] as DayRecord);
  const named = nameOf(peakKey);
  return {
    id: named.id,
    name: named.name,
    peakKey,
    fromKey: monthDayOf(ALL_DAYS[from] as DayRecord),
    toKey: monthDayOf(ALL_DAYS[to] as DayRecord),
    peakVisitors: Math.round(seasonal[peakIndex] ?? 0),
    lengthDays: to >= from ? to - from + 1 : N - from + to + 1,
  };
};

const peakIndices = detectPeaks();

export const BLOOM_WINDOWS: readonly BloomWindow[] = peakIndices.map(buildWindow);

const indexByKey = new Map<number, number>(
  ALL_DAYS.map((day, index) => [monthDayOf(day), index] as const)
);

const indexOfDate = (date: Date) => {
  const key = monthDayKey(date);
  return indexByKey.get(key) ?? indexByKey.get(key - 1) ?? 0;
};

const cyclicDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b);
  return Math.min(diff, N - diff);
};

const nearestPeakIndex = (index: number) =>
  peakIndices.reduce(
    (closest, candidate) =>
      cyclicDistance(candidate, index) < cyclicDistance(closest, index) ? candidate : closest,
    peakIndices[0] ?? index
  );

export const seasonalVisitors = (date: Date) => Math.round(seasonal[indexOfDate(date)] ?? 0);

const peakIndexById = new Map<string, number>(
  peakIndices.map((index) => [nameOf(monthDayOf(ALL_DAYS[index] as DayRecord)).id, index] as const)
);

export const bloomRatio = (date: Date, targetId?: string): number => {
  const index = indexOfDate(date);
  const nearest = nearestPeakIndex(index);
  if (targetId !== undefined) {
    const target = peakIndexById.get(targetId);
    if (target === undefined || target !== nearest) return 0;
  }
  const peak = excessAt(nearest);
  if (peak <= 0) return 0;
  return Math.min(excessAt(index) / peak, 1);
};

export const bloomWindowOf = (date: Date): BloomWindow | undefined => {
  const key = monthDayKey(date);
  return BLOOM_WINDOWS.find((window) =>
    window.fromKey <= window.toKey
      ? key >= window.fromKey && key <= window.toKey
      : key >= window.fromKey || key <= window.toKey
  );
};

export const nearestBloomWindow = (date: Date): BloomWindow | undefined => {
  const index = nearestPeakIndex(indexOfDate(date));
  const key = monthDayOf(ALL_DAYS[index] as DayRecord);
  return BLOOM_WINDOWS.find((window) => window.peakKey === key);
};

export const daysUntil = (from: Date, monthDay: number): number => {
  const month = Math.floor(monthDay / 100);
  const day = monthDay % 100;
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target = new Date(from.getFullYear(), month - 1, day);
  if (target < base) target.setFullYear(target.getFullYear() + 1);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
};

export const expectedVisitors = (date: Date, weatherCategory: WeatherCategory): number => {
  const base = seasonal[indexOfDate(date)] ?? 0;
  const weekday = WEEKDAY_FACTOR[date.getDay()] ?? 1;
  return Math.round(base * weekday * WEATHER_FACTOR[weatherCategory]);
};

const ascendingVisitors = [...ALL_DAYS.map((day) => day.visitors)].sort((a, b) => a - b);

export const visitorPercentile = (visitors: number): number => {
  const below = ascendingVisitors.filter((value) => value < visitors).length;
  return below / ascendingVisitors.length;
};
