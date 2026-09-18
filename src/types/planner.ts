import type { WeatherCategory, DayRecord } from './visitors';

export type PurposeId = 'none' | 'tsutsuji' | 'kouyou' | 'lesser-panda';
export type TransportId = 'local' | 'train' | 'car';
export type CompanionId = 'adults' | 'kids' | 'seniors';
export type PeriodId = 'week' | 'month' | 'long-weekend' | 'year';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Preferences {
  readonly purpose: PurposeId;
  readonly transport: TransportId;
  readonly companion: CompanionId;
  readonly priority: number;
}

export interface Weights {
  readonly bloom: number;
  readonly weather: number;
  readonly temperature: number;
  readonly room: number;
}

export type ScoreKey = keyof Weights;

export type OutlookSource = 'forecast' | 'normal';

export interface DayOutlook {
  readonly date: Date;
  readonly source: OutlookSource;
  readonly category: WeatherCategory;
  readonly tempMax: number;
  readonly tempMin: number;
}

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

export interface Season {
  readonly id: SeasonId;
  readonly label: string;
  readonly months: readonly number[];
  readonly highlight: string;
}

/** 実測365日から求める、季節ごとの動かない事実 */
export interface SeasonFacts {
  readonly id: SeasonId;
  readonly totalDays: number;
  readonly comfortableDays: number;
  readonly medianVisitors: number;
  readonly peak: DayRecord | undefined;
}

export interface SeasonScore {
  readonly id: SeasonId;
  readonly label: string;
  readonly highlight: string;
  readonly total: number;
  readonly best: DayScore | undefined;
  readonly runnersUp: readonly DayScore[];
  readonly facts: SeasonFacts;
}

export interface Claim {
  readonly seasons: readonly SeasonScore[];
  readonly season: SeasonScore | undefined;
  readonly day: DayScore | undefined;
  /** 結論。ページ最上部の一文 */
  readonly headline: string;
  /** 大きく出す数字 */
  readonly figure: string;
  /** 数字が何を意味するか */
  readonly figureNote: string;
  /** なぜこの季節なのか */
  readonly reason: string;
}

export interface PlannerState {
  readonly preferences: Preferences;
  readonly period: PeriodId;
}
