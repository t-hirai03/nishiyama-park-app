export const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'] as const;

export const addDays = (base: Date, days: number): Date => {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const isWeekendDate = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;

/** 月日を 1115 のような整数にする。年をまたぐ比較に使う */
export const monthDayKey = (date: Date): number => (date.getMonth() + 1) * 100 + date.getDate();

export const formatMonthDay = (key: number): string => `${Math.floor(key / 100)}/${key % 100}`;

const weekdayOf = (date: Date): string => WEEKDAY_LABEL[date.getDay()] ?? '';

export const formatDateLabel = (date: Date): string =>
  `${date.getMonth() + 1}月${date.getDate()}日（${weekdayOf(date)}）`;

export const formatShortDate = (date: Date): string =>
  `${date.getMonth() + 1}/${date.getDate()}（${weekdayOf(date)}）`;

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
