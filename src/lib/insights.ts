import { ALL_DAYS, WEATHER_LABEL, type DayRecord, type WeatherCategory } from './congestion';
import { highlightOf } from './season';
import monthlyPark from '../data/monthly-park.json';
import monthlyZoo from '../data/monthly-zoo.json';
import monthlyMichinoeki from '../data/monthly-michinoeki.json';
import tsutsuji from '../data/tsutsuji.json';
import municipality from '../data/municipality.json';
import parking from '../data/parking.json';

const average = (values: number[]) =>
  values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

const TEMP_BANDS = [
  { label: '5℃未満', min: -99, max: 5 },
  { label: '5〜10℃', min: 5, max: 10 },
  { label: '10〜15℃', min: 10, max: 15 },
  { label: '15〜20℃', min: 15, max: 20 },
  { label: '20〜25℃', min: 20, max: 25 },
  { label: '25〜30℃', min: 25, max: 30 },
  { label: '30℃以上', min: 30, max: 99 },
];

export const byTemperature = TEMP_BANDS.map((band) => {
  const days = ALL_DAYS.filter((d) => d.tempMax >= band.min && d.tempMax < band.max);
  return { label: band.label, days: days.length, average: average(days.map((d) => d.visitors)) };
});

const CATEGORIES: WeatherCategory[] = ['sunny', 'cloudy', 'rain', 'snow'];

export const byWeather = CATEGORIES.map((category) => {
  const cell = (isWeekend: boolean) => {
    const days = ALL_DAYS.filter((d) => d.weatherCategory === category && d.isWeekend === isWeekend);
    return { days: days.length, average: average(days.map((d) => d.visitors)) };
  };
  return { category, label: WEATHER_LABEL[category], weekend: cell(true), weekday: cell(false) };
});

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
      average: average(days.map((day) => day.visitors)),
      peak: Math.max(...days.map((day) => day.visitors)),
      averageTempMax: average(days.map((day) => day.tempMax)),
      highlight: highlightOf(new Date(2025, month - 1, 15)),
    };
  });
})();

export const yearStats = {
  average: average(ALL_DAYS.map((d) => d.visitors)),
  busiest: [...ALL_DAYS].sort((a, b) => b.visitors - a.visitors)[0],
  quietest: [...ALL_DAYS].sort((a, b) => a.visitors - b.visitors)[0],
  total: ALL_DAYS.reduce((sum, d) => sum + d.visitors, 0),
};

interface MonthlySeries {
  label: string;
  years: string[];
  months: { month: string; values: (number | null)[] }[];
}

const latestYearValues = (series: MonthlySeries) =>
  series.months.map((m) => ({ month: m.month, value: m.values[0] ?? 0 }));

export const monthlySeries = [
  { label: '西山公園', color: '#15803d', data: latestYearValues(monthlyPark) },
  { label: '西山動物園', color: '#b45309', data: latestYearValues(monthlyZoo) },
  { label: '道の駅西山公園', color: '#0369a1', data: latestYearValues(monthlyMichinoeki) },
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

export const parkingByWeekday = (() => {
  const order = ['月', '火', '水', '木', '金', '土', '日'];
  return order.map((weekday) => ({
    weekday,
    average: average(parking.days.filter((d) => d.weekday === weekday).map((d) => d.exits)),
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
