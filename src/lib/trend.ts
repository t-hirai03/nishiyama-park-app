import monthlyZoo from '../data/monthly-zoo.json';

/**
 * コロナ禍で臨時休園・行動制限があった年度。長期トレンドの比較から除く。
 * 令和2年度は欠測(null)を含み、令和3年度は5月が8,230人と平年の1/5に落ちている。
 * 両年とも直近6年の側に入るため、残すと「近年は減った」という逆の結論になる。
 */
const EXCLUDED_YEARS: readonly string[] = ['令和２年度', '令和３年度'];

const SAMPLE_YEARS = 6;

/** years は新しい順。古い順に並べ替えたインデックスを返す */
const chronologicalIndices = (): readonly number[] =>
  monthlyZoo.years.map((_, index) => index).reverse();

const valueAt = (monthLabel: string, index: number): number | null => {
  const row = monthlyZoo.months.find((month) => month.month === monthLabel);
  const value = row?.values[index];
  return typeof value === 'number' ? value : null;
};

export interface MonthTrend {
  readonly month: string;
  readonly early: number;
  readonly late: number;
  /** 前期比の変化率。0.64 なら +64% */
  readonly change: number;
  readonly sampleYears: number;
}

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/** 動物園18年分から、指定した月の「前期6年平均」と「直近6年平均」を比べる */
export const monthTrend = (monthLabel: string): MonthTrend | undefined => {
  const usable = chronologicalIndices().filter(
    (index) =>
      !EXCLUDED_YEARS.some((year) => year === monthlyZoo.years[index]) &&
      valueAt(monthLabel, index) !== null
  );
  if (usable.length < SAMPLE_YEARS * 2) return undefined;

  const pick = (indices: readonly number[]): readonly number[] =>
    indices.flatMap((index) => {
      const value = valueAt(monthLabel, index);
      return value === null ? [] : [value];
    });

  const early = average(pick(usable.slice(0, SAMPLE_YEARS)));
  const late = average(pick(usable.slice(-SAMPLE_YEARS)));
  if (early === 0) return undefined;

  return {
    month: monthLabel,
    early,
    late,
    change: late / early - 1,
    sampleYears: SAMPLE_YEARS,
  };
};

export const TSUTSUJI_TREND = monthTrend('5月');
export const KOUYOU_TREND = monthTrend('11月');

export const formatChange = (change: number): string =>
  `${change >= 0 ? '+' : ''}${Math.round(change * 100)}%`;
