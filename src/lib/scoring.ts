import { isWeekendDate, type WeatherCategory } from './days';
import { expectedWeatherRatio, temperatureRatio, weatherRatio } from './climate';
import { bloomRatio, expectedVisitors, visitorPercentile } from './seasonality';

export const PURPOSES = [
  { id: 'none', label: '特になし' },
  { id: 'tsutsuji', label: 'ツツジ' },
  { id: 'kouyou', label: '紅葉' },
  { id: 'lesser-panda', label: 'レッサーパンダ' },
] as const;
export type PurposeId = (typeof PURPOSES)[number]['id'];

export const TRANSPORTS = [
  { id: 'local', label: '福井県内から' },
  { id: 'train', label: '県外・鉄道' },
  { id: 'car', label: '県外・自動車' },
] as const;
export type TransportId = (typeof TRANSPORTS)[number]['id'];

export const COMPANIONS = [
  { id: 'adults', label: '大人のみ' },
  { id: 'kids', label: '子ども連れ' },
  { id: 'seniors', label: '高齢者連れ' },
] as const;
export type CompanionId = (typeof COMPANIONS)[number]['id'];

export interface Preferences {
  readonly purpose: PurposeId;
  readonly transport: TransportId;
  readonly companion: CompanionId;
  readonly priority: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  purpose: 'none',
  transport: 'local',
  companion: 'adults',
  priority: 50,
};

export interface Weights {
  readonly bloom: number;
  readonly weather: number;
  readonly temperature: number;
  readonly room: number;
}

const PURPOSE_WEIGHTS: Record<PurposeId, Weights> = {
  none: { bloom: 40, weather: 30, temperature: 20, room: 10 },
  tsutsuji: { bloom: 55, weather: 25, temperature: 10, room: 10 },
  kouyou: { bloom: 55, weather: 25, temperature: 10, room: 10 },
  'lesser-panda': { bloom: 5, weather: 25, temperature: 45, room: 25 },
};

const TRANSPORT_BONUS: Record<TransportId, number> = { local: 0, train: 5, car: 10 };

const COMPANION_BONUS: Record<CompanionId, { temperature: number; room: number }> = {
  adults: { temperature: 0, room: 0 },
  kids: { temperature: 10, room: 5 },
  seniors: { temperature: 10, room: 10 },
};

const applyPriority = (weights: Weights, priority: number): Weights => {
  const shift = (priority - 50) / 50;
  if (shift === 0) return weights;
  if (shift < 0) {
    const moved = weights.room * -shift;
    return { ...weights, bloom: weights.bloom + moved, room: weights.room - moved };
  }
  const moved = weights.bloom * shift;
  return { ...weights, bloom: weights.bloom - moved, room: weights.room + moved };
};

const normalize = (weights: Weights): Weights => {
  const total = weights.bloom + weights.weather + weights.temperature + weights.room;
  if (total <= 0) return weights;
  const scale = 100 / total;
  return {
    bloom: weights.bloom * scale,
    weather: weights.weather * scale,
    temperature: weights.temperature * scale,
    room: weights.room * scale,
  };
};

export const buildWeights = (preferences: Preferences): Weights => {
  const base = PURPOSE_WEIGHTS[preferences.purpose];
  const companion = COMPANION_BONUS[preferences.companion];
  const adjusted: Weights = {
    bloom: base.bloom,
    weather: base.weather + TRANSPORT_BONUS[preferences.transport],
    temperature: base.temperature + companion.temperature,
    room: base.room + companion.room,
  };
  return normalize(applyPriority(adjusted, preferences.priority));
};

const BLOOM_TARGET: Record<PurposeId, string | undefined> = {
  none: undefined,
  tsutsuji: 'tsutsuji',
  kouyou: 'kouyou',
  'lesser-panda': undefined,
};

export type OutlookSource = 'forecast' | 'normal';

export interface DayOutlook {
  readonly date: Date;
  readonly source: OutlookSource;
  readonly category: WeatherCategory;
  readonly tempMax: number;
  readonly tempMin: number;
}

export const SCORE_KEYS = ['bloom', 'weather', 'temperature', 'room'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export const SCORE_LABEL: Record<ScoreKey, string> = {
  bloom: '見頃',
  weather: '天気',
  temperature: '気温',
  room: 'ゆとり',
};

export interface ScoreItem {
  readonly key: ScoreKey;
  readonly label: string;
  readonly weight: number;
  readonly ratio: number;
  readonly points: number;
}

export interface DayScore {
  readonly outlook: DayOutlook;
  readonly total: number;
  readonly items: readonly ScoreItem[];
  readonly expectedVisitors: number;
  readonly roomPercentile: number;
  readonly isWeekend: boolean;
}

const itemOf = (key: ScoreKey, weight: number, ratio: number): ScoreItem => ({
  key,
  label: SCORE_LABEL[key],
  weight,
  ratio,
  points: weight * ratio,
});

export const scoreDay = (outlook: DayOutlook, preferences: Preferences): DayScore => {
  const weights = buildWeights(preferences);
  const isWeekend = isWeekendDate(outlook.date);
  const visitors = expectedVisitors(outlook.date, outlook.category);
  const percentile = visitorPercentile(visitors);

  const weather =
    outlook.source === 'forecast'
      ? weatherRatio(outlook.category, isWeekend)
      : expectedWeatherRatio(outlook.date.getMonth() + 1, isWeekend);

  const items: readonly ScoreItem[] = [
    itemOf('bloom', weights.bloom, bloomRatio(outlook.date, BLOOM_TARGET[preferences.purpose])),
    itemOf('weather', weights.weather, weather),
    itemOf('temperature', weights.temperature, temperatureRatio(outlook.tempMax)),
    itemOf('room', weights.room, 1 - percentile),
  ];

  return {
    outlook,
    total: Math.round(items.reduce((sum, item) => sum + item.points, 0)),
    items,
    expectedVisitors: visitors,
    roomPercentile: percentile,
    isWeekend,
  };
};

export const rankDays = (
  outlooks: readonly DayOutlook[],
  preferences: Preferences
): readonly DayScore[] =>
  [...outlooks]
    .map((outlook) => scoreDay(outlook, preferences))
    .sort((a, b) => b.total - a.total || a.outlook.date.getTime() - b.outlook.date.getTime());

export const dominantItem = (score: DayScore): ScoreItem =>
  [...score.items].sort((a, b) => b.weight - a.weight)[0] as ScoreItem;

export const weakestItem = (score: DayScore): ScoreItem | undefined =>
  [...score.items]
    .filter((item) => item.weight >= 5)
    .sort((a, b) => a.ratio - b.ratio)[0];
