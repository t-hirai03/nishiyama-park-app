import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'data/raw';
const OUT = 'src/data';

const readSheet = (file) => {
  const wb = XLSX.read(readFileSync(join(RAW, file)), { type: 'buffer', codepage: 932 });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
};

const readCsv = (file) =>
  new TextDecoder('shift_jis')
    .decode(readFileSync(join(RAW, file)))
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && line.replace(/,/g, '') !== '')
    .map((line) => line.split(','));

const classifyWeather = (text) => {
  if (text.includes('雪')) return 'snow';
  if (/^(小雨|大雨|雨)/.test(text)) return 'rain';
  if (text.startsWith('晴')) return 'sunny';
  if (text.startsWith('曇')) return 'cloudy';
  return 'cloudy';
};

const buildDailyVisitors = () => {
  const rows = readCsv('nishiyama-east-daily-visitors-r7.csv').slice(2);
  const days = rows.map(([date, weekday, , visitors, weather, tempMax, tempMin]) => ({
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    weekday,
    isWeekend: weekday === '土' || weekday === '日',
    visitors: Number(visitors),
    weather,
    weatherCategory: classifyWeather(weather),
    hasPrecipitation: /雨|雪/.test(weather),
    tempMax: Number(tempMax),
    tempMin: Number(tempMin),
  }));
  return {
    area: '西山公園東側',
    fiscalYear: '令和7年度',
    note: 'Agoop社の人流推計による参考値。公園全体ではなく東側エリアの来訪者数。',
    days,
  };
};

const MONTH_ORDER = ['4月','5月','6月','7月','8月','9月','10月','11月','12月','1月','2月','3月'];

const buildMonthlySeries = (file, label) => {
  const rows = readSheet(file);
  const years = rows[1].slice(1).filter(Boolean);
  const byMonth = new Map(
    rows.slice(2).filter((r) => MONTH_ORDER.includes(r[0])).map((r) => [r[0], r.slice(1)])
  );
  return {
    label,
    years,
    months: MONTH_ORDER.map((month) => ({
      month,
      values: years.map((_, i) => {
        const v = byMonth.get(month)?.[i];
        return typeof v === 'number' ? v : null;
      }),
    })),
  };
};

const buildTsutsuji = () => {
  const rows = readSheet('tsutsuji-species-and-counts.xls');
  const species = rows
    .slice(2)
    .filter((r) => r[0] !== '合計' && typeof r[1] === 'number')
    .map(([label, count]) => {
      const m = label.match(/^(.+?)[（(](.+)[）)]$/);
      return {
        species: m ? m[1] : label,
        areas: m ? m[2].split(/[、,]/).map((s) => s.trim()) : [],
        count,
      };
    });
  return { total: species.reduce((s, x) => s + x.count, 0), species };
};

const buildMunicipality = () => {
  const rows = readCsv('nishiyama-visitors-by-municipality-r7.csv').slice(2);
  const groups = { holiday: [], weekday: [] };
  for (const r of rows) {
    if (r.length < 7 || !r[4]) continue;
    const key = r[2] === '休日' ? 'holiday' : 'weekday';
    groups[key].push({ rank: Number(r[3]), name: r[4], share: Number(r[6].replace('%', '')) });
  }
  return { fiscalYear: '令和7年度', ...groups };
};

const buildParking = () => {
  const rows = readCsv('parking-exits-202604-UNIDENTIFIED.csv').slice(1);
  return {
    month: '2026-04',
    note: '出典未確認のため補助指標として扱う。',
    days: rows
      .filter((r) => r[0] && !Number.isNaN(Number(r[0])))
      .map(([day, weekday, exits]) => ({ day: Number(day), weekday, exits: Number(exits) })),
  };
};

mkdirSync(OUT, { recursive: true });
const outputs = {
  'daily-visitors.json': buildDailyVisitors(),
  'monthly-park.json': buildMonthlySeries('nishiyama-park-visitors-monthly.xls', '西山公園入場者数'),
  'monthly-zoo.json': buildMonthlySeries('nishiyama-zoo-visitors-monthly.xls', '西山動物園入場者数'),
  'monthly-michinoeki.json': buildMonthlySeries('michinoeki-nishiyama-visitors-monthly.xls', '道の駅西山公園入場者数'),
  'tsutsuji.json': buildTsutsuji(),
  'municipality.json': buildMunicipality(),
  'parking.json': buildParking(),
};

for (const [name, data] of Object.entries(outputs)) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  console.log(`${name}: ${JSON.stringify(data).length.toLocaleString()} bytes`);
}
