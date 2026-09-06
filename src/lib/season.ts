import { ALL_DAYS, monthDayOf, type DayRecord } from './days';
import { buildOutlooks, type ForecastMap } from './forecast';
import { rankDays, type DayScore, type Preferences } from './scoring';

export const SEASONS = [
  { id: 'spring', label: '春', months: [3, 4, 5], highlight: '桜とツツジ' },
  { id: 'summer', label: '夏', months: [6, 7, 8], highlight: '新緑' },
  { id: 'autumn', label: '秋', months: [9, 10, 11], highlight: '紅葉' },
  { id: 'winter', label: '冬', months: [12, 1, 2], highlight: '静けさ' },
] as const;

export type SeasonId = (typeof SEASONS)[number]['id'];

/** 季節の得点は上位 TOP_DAYS 日の平均。全日平均だと「行かない日」に引きずられる */
const TOP_DAYS = 5;

/** 15〜25℃かつ晴/曇を快適日とする。斜面を歩ける条件 */
const COMFORT_MIN = 15;
const COMFORT_MAX = 25;

const seasonOfMonth = (month: number): SeasonId => {
  const found = SEASONS.find((season) =>
    season.months.some((candidate) => candidate === month)
  );
  return found?.id ?? 'winter';
};

export const seasonOfDate = (date: Date): SeasonId => seasonOfMonth(date.getMonth() + 1);

const isComfortable = (record: DayRecord): boolean =>
  record.tempMax >= COMFORT_MIN &&
  record.tempMax <= COMFORT_MAX &&
  (record.weatherCategory === 'sunny' || record.weatherCategory === 'cloudy');

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** 実測365日から求める、季節ごとの動かない事実 */
export interface SeasonFacts {
  readonly id: SeasonId;
  readonly totalDays: number;
  readonly comfortableDays: number;
  readonly medianVisitors: number;
  readonly peak: DayRecord | undefined;
}

const factsOf = (id: SeasonId): SeasonFacts => {
  const records = ALL_DAYS.filter(
    (record) => seasonOfMonth(Math.floor(monthDayOf(record) / 100)) === id
  );
  const peak = [...records].sort((a, b) => b.visitors - a.visitors)[0];
  return {
    id,
    totalDays: records.length,
    comfortableDays: records.filter(isComfortable).length,
    medianVisitors: median(records.map((record) => record.visitors)),
    peak,
  };
};

export const SEASON_FACTS: Record<SeasonId, SeasonFacts> = {
  spring: factsOf('spring'),
  summer: factsOf('summer'),
  autumn: factsOf('autumn'),
  winter: factsOf('winter'),
};

/** 年間で最も混んだ日。比較の基準として主張文で使う */
export const BUSIEST_DAY: DayRecord | undefined = [...ALL_DAYS].sort(
  (a, b) => b.visitors - a.visitors
)[0];

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

/** 基準日から1年分を季節ごとに振り分ける。常に「これから来る」季節を見る */
const upcomingDates = (baseDate: Date): Record<SeasonId, readonly Date[]> => {
  const buckets: Record<SeasonId, Date[]> = {
    spring: [],
    summer: [],
    autumn: [],
    winter: [],
  };
  for (let offset = 0; offset < 365; offset += 1) {
    const date = addDays(baseDate, offset);
    buckets[seasonOfDate(date)].push(date);
  }
  return buckets;
};

export interface SeasonScore {
  readonly id: SeasonId;
  readonly label: string;
  readonly highlight: string;
  readonly total: number;
  readonly best: DayScore | undefined;
  readonly runnersUp: readonly DayScore[];
  readonly facts: SeasonFacts;
}

const scoreSeason = (
  id: SeasonId,
  dates: readonly Date[],
  preferences: Preferences,
  forecast: ForecastMap | null
): SeasonScore => {
  const definition = SEASONS.find((season) => season.id === id);
  const ranked = rankDays(buildOutlooks(dates, forecast), preferences);
  const top = ranked.slice(0, TOP_DAYS);
  const total =
    top.length > 0
      ? Math.round(top.reduce((sum, score) => sum + score.total, 0) / top.length)
      : 0;

  return {
    id,
    label: definition?.label ?? '',
    highlight: definition?.highlight ?? '',
    total,
    best: ranked[0],
    runnersUp: ranked.slice(1, 4),
    facts: SEASON_FACTS[id],
  };
};

export const rankSeasons = (
  baseDate: Date,
  preferences: Preferences,
  forecast: ForecastMap | null
): readonly SeasonScore[] => {
  const buckets = upcomingDates(baseDate);
  return SEASONS.map((season) =>
    scoreSeason(season.id, buckets[season.id], preferences, forecast)
  ).sort((a, b) => b.total - a.total);
};
