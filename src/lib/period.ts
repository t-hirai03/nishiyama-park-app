import { findLongWeekend } from './holidays';

export const PERIODS = [
  { id: 'week', label: '今週' },
  { id: 'month', label: '今月' },
  { id: 'long-weekend', label: '次の3連休' },
  { id: 'year', label: '通年' },
] as const;
export type PeriodId = (typeof PERIODS)[number]['id'];

const MIN_DAYS = 7;
const YEAR_DAYS = 365;

const addDays = (base: Date, days: number) => {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

const sequence = (from: Date, count: number): readonly Date[] =>
  Array.from({ length: count }, (_, index) => addDays(from, index));

const untilMonthEnd = (from: Date): readonly Date[] => {
  const lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  return sequence(from, Math.max(lastDay - from.getDate() + 1, MIN_DAYS));
};

const longWeekend = (from: Date): readonly Date[] => {
  const run = findLongWeekend(from);
  return run.length > 0 ? run : sequence(from, MIN_DAYS);
};

export const datesOf = (period: PeriodId, baseDate: Date): readonly Date[] => {
  switch (period) {
    case 'week':
      return sequence(baseDate, MIN_DAYS);
    case 'month':
      return untilMonthEnd(baseDate);
    case 'long-weekend':
      return longWeekend(baseDate);
    case 'year':
      return sequence(baseDate, YEAR_DAYS);
  }
};

export const describePeriod = (dates: readonly Date[]): string => {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return '';
  const format = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  return `${format(first)}〜${format(last)}（${dates.length}日間）`;
};
