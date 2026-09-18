import { ALL_DAYS } from './days';
import monthlyPark from '../data/monthly-park.json';
import monthlyZoo from '../data/monthly-zoo.json';
import monthlyMichinoeki from '../data/monthly-michinoeki.json';
import tsutsuji from '../data/tsutsuji.json';
import municipality from '../data/municipality.json';
import parking from '../data/parking.json';
import { SERIES_COLOR_VAR } from '../constants/colors';
import type { DayRecord, MonthlySeries } from '../types/visitors';
import { roundedMean } from '../utils/math';

export const byMonth = (() => {
  const groups = new Map<string, DayRecord[]>();
  for (const day of ALL_DAYS) {
    const key = day.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const month = Number(key.slice(5, 7));
    return {
      key,
      month,
      label: `${month}月`,
      average: roundedMean(days.map((day) => day.visitors)),
      peak: Math.max(...days.map((day) => day.visitors)),
      averageTempMax: roundedMean(days.map((day) => day.tempMax)),
    };
  });
})();

export const yearStats = {
  average: roundedMean(ALL_DAYS.map((d) => d.visitors)),
  busiest: [...ALL_DAYS].sort((a, b) => b.visitors - a.visitors)[0],
  quietest: [...ALL_DAYS].sort((a, b) => a.visitors - b.visitors)[0],
  total: ALL_DAYS.reduce((sum, d) => sum + d.visitors, 0),
};

const latestYearValues = (series: MonthlySeries) =>
  series.months.map((m) => ({ month: m.month, value: m.values[0] ?? 0 }));

export const monthlySeries = [
  { label: '西山公園', colorVar: SERIES_COLOR_VAR.park, data: latestYearValues(monthlyPark) },
  { label: '西山動物園', colorVar: SERIES_COLOR_VAR.zoo, data: latestYearValues(monthlyZoo) },
  {
    label: '道の駅西山公園',
    colorVar: SERIES_COLOR_VAR.michinoeki,
    data: latestYearValues(monthlyMichinoeki),
  },
];

const ERA_OFFSET: Record<string, number> = { 平成: 1988, 令和: 2018 };

const toHalfWidthDigits = (value: string) =>
  value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));

const toFiscalYear = (era: string): string => {
  const matched = toHalfWidthDigits(era.trim()).match(/^(平成|令和)(\d+)年度$/);
  const offset = matched ? ERA_OFFSET[matched[1] ?? ''] : undefined;
  if (!matched || offset === undefined) return era;
  return String(offset + Number(matched[2]));
};

export const zooYearly = monthlyZoo.years
  .map((year, i) => ({
    year,
    fiscalYear: toFiscalYear(year),
    total: monthlyZoo.months.reduce((sum, m) => sum + (m.values[i] ?? 0), 0),
    hasGap: monthlyZoo.months.some((m) => m.values[i] === null),
  }))
  .reverse();

export const tsutsujiSpecies = [...tsutsuji.species].sort((a, b) => b.count - a.count);
export const tsutsujiTotal = tsutsuji.total;

export const municipalityShares = municipality;

/** 休日の居住地上位のうち、福井県内の市町村が占める件数 */
export const topAreasInFukui = {
  total: municipality.holiday.length,
  inFukui: municipality.holiday.filter((area) => area.name.startsWith('福井県')).length,
};

export const parkingByWeekday = (() => {
  const order = ['月', '火', '水', '木', '金', '土', '日'];
  return order.map((weekday) => ({
    weekday,
    average: roundedMean(parking.days.filter((d) => d.weekday === weekday).map((d) => d.exits)),
  }));
})();

const sumLatestYear = (series: MonthlySeries) =>
  series.months.reduce((total, month) => total + (month.values[0] ?? 0), 0);

export const annualTotals = {
  park: sumLatestYear(monthlyPark),
  zoo: sumLatestYear(monthlyZoo),
  michinoeki: sumLatestYear(monthlyMichinoeki),
  eastArea: yearStats.total,
};

export const parkZooRatios = monthlyPark.months.map((month, index) => {
  const park = month.values[0] ?? 0;
  const zoo = monthlyZoo.months[index]?.values[0] ?? 0;
  return {
    month: month.month,
    park,
    zoo,
    ratio: zoo === 0 ? 0 : Math.round((park / zoo) * 100) / 100,
  };
});
