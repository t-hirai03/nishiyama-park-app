import { toIsoDate } from './days';

const nthMonday = (year: number, month: number, nth: number) => {
  const first = new Date(year, month - 1, 1);
  const offset = (8 - first.getDay()) % 7;
  return new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
};

// 1980〜2099年に有効な近似式（国立天文台の暦要項に基づく通説の式）
const equinox = (year: number, constant: number) =>
  Math.floor(constant + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));

const fixedHolidays = (year: number): readonly (readonly [Date, string])[] => [
  [new Date(year, 0, 1), '元日'],
  [nthMonday(year, 1, 2), '成人の日'],
  [new Date(year, 1, 11), '建国記念の日'],
  [new Date(year, 1, 23), '天皇誕生日'],
  [new Date(year, 2, equinox(year, 20.8431)), '春分の日'],
  [new Date(year, 3, 29), '昭和の日'],
  [new Date(year, 4, 3), '憲法記念日'],
  [new Date(year, 4, 4), 'みどりの日'],
  [new Date(year, 4, 5), 'こどもの日'],
  [nthMonday(year, 7, 3), '海の日'],
  [new Date(year, 7, 11), '山の日'],
  [nthMonday(year, 9, 3), '敬老の日'],
  [new Date(year, 8, equinox(year, 23.2488)), '秋分の日'],
  [nthMonday(year, 10, 2), 'スポーツの日'],
  [new Date(year, 10, 3), '文化の日'],
  [new Date(year, 10, 23), '勤労感謝の日'],
];

const cache = new Map<number, Map<string, string>>();

const buildYear = (year: number): Map<string, string> => {
  const table = new Map<string, string>();
  for (const [date, name] of fixedHolidays(year)) table.set(toIsoDate(date), name);

  for (const [date] of fixedHolidays(year)) {
    if (date.getDay() !== 0) continue;
    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (table.has(toIsoDate(substitute)));
    table.set(toIsoDate(substitute), '振替休日');
  }

  const respectForAged = nthMonday(year, 9, 3);
  const autumnEquinox = new Date(year, 8, equinox(year, 23.2488));
  if (autumnEquinox.getDate() - respectForAged.getDate() === 2) {
    const between = new Date(respectForAged);
    between.setDate(between.getDate() + 1);
    table.set(toIsoDate(between), '国民の休日');
  }

  return table;
};

const tableOf = (year: number) => {
  const cached = cache.get(year);
  if (cached) return cached;
  const built = buildYear(year);
  cache.set(year, built);
  return built;
};

export const holidayNameOf = (date: Date): string | undefined =>
  tableOf(date.getFullYear()).get(toIsoDate(date));

export const isDayOff = (date: Date) =>
  date.getDay() === 0 || date.getDay() === 6 || holidayNameOf(date) !== undefined;

export const findLongWeekend = (from: Date): readonly Date[] => {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let offset = 0; offset < 400; offset += 1) {
    const run: Date[] = [];
    const probe = new Date(cursor);
    probe.setDate(probe.getDate() + offset);
    while (isDayOff(probe) && run.length < 6) {
      run.push(new Date(probe));
      probe.setDate(probe.getDate() + 1);
    }
    if (run.length >= 3) return run;
  }
  return [];
};
