import { formatDateLabel } from './days';
import type { ForecastMap } from './forecast';
import { BUSIEST_DAY, rankSeasons, type SeasonScore, type SeasonId } from './season';
import type { DayScore, Preferences } from './scoring';
import { KOUYOU_TREND, TSUTSUJI_TREND, formatChange } from './trend';

/**
 * ページの主張。「結論 + 数字 + 比較対象」の3要素で組み立てる。
 * 条件の組み合わせは目的4 x 同行者3 x 交通3 x 期間4 x スライダーで数百通りあるため、
 * 文面を列挙せず要素を合成する。
 */
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

/** 年間最多の日と比べて何分の1か。1未満なら比較を出さない */
const fractionOfBusiest = (visitors: number): number | undefined => {
  if (!BUSIEST_DAY || visitors <= 0) return undefined;
  const ratio = BUSIEST_DAY.visitors / visitors;
  return ratio >= 2 ? Math.round(ratio) : undefined;
};

const busiestLabel = (): string => {
  if (!BUSIEST_DAY) return '';
  const [, month, day] = BUSIEST_DAY.date.split('-');
  return `${Number(month)}/${Number(day)}`;
};

const REASON: Record<SeasonId, (season: SeasonScore) => string> = {
  autumn: (season) => {
    const trend = KOUYOU_TREND;
    const growth =
      trend && TSUTSUJI_TREND
        ? `動物園の11月は直近6年で${formatChange(trend.change)}、5月は${formatChange(TSUTSUJI_TREND.change)}。伸びているのは秋です。`
        : '';
    return `${growth}15〜25℃で晴れか曇りの日は${season.facts.totalDays}日中${season.facts.comfortableDays}日。春に次ぐ多さでありながら、人出の中央値は${season.facts.medianVisitors.toLocaleString()}人と春より少ないです。`;
  },
  spring: (season) =>
    `ヒラドツツジを中心に11種50,025株。ただし${busiestLabel()}は年間最多の${BUSIEST_DAY?.visitors.toLocaleString() ?? ''}人で、混雑も年間最大になります。快適日は${season.facts.totalDays}日中${season.facts.comfortableDays}日。`,
  summer: (season) =>
    `15〜25℃で晴れか曇りの日は${season.facts.totalDays}日中${season.facts.comfortableDays}日しかありません。斜面の屋外は朝夕が現実的で、日中の主役は動物園と道の駅になります。`,
  winter: (season) =>
    `快適日は${season.facts.totalDays}日中${season.facts.comfortableDays}日。人出の中央値は${season.facts.medianVisitors.toLocaleString()}人で、四季で最も静かです。3月に入ると桜へ向けて動き出します。`,
};

export const buildClaim = (
  baseDate: Date,
  preferences: Preferences,
  forecast: ForecastMap | null
): Claim => {
  const seasons = rankSeasons(baseDate, preferences, forecast);
  const season = seasons[0];
  const day = season?.best;

  if (!season || !day) {
    return {
      seasons,
      season,
      day,
      headline: '条件に合う日が見つかりませんでした',
      figure: '—',
      figureNote: '',
      reason: '',
    };
  }

  const visitors = day.expectedVisitors;
  const fraction = fractionOfBusiest(visitors);

  return {
    seasons,
    season,
    day,
    headline: `あなたの狙い目は${season.label}。${formatDateLabel(day.outlook.date)}です`,
    figure: `${visitors.toLocaleString()}人`,
    figureNote: fraction
      ? `予想人出。年間最多の${busiestLabel()}（${BUSIEST_DAY?.visitors.toLocaleString() ?? ''}人）の約${fraction}分の1です`
      : '予想人出',
    reason: REASON[season.id](season),
  };
};
