import tsutsuji from '../data/tsutsuji.json';
import { WEATHER_LABEL, formatMonthDay, lastYearSameDay } from './days';
import {
  TEMPERATURE_BANDS,
  TEMPERATURE_PEAK,
  WEATHER_STATS,
  normalOf,
} from './climate';
import { bloomWindowOf, daysUntil, nearestBloomWindow } from './seasonality';
import type { DayScore, Preferences, ScoreItem, ScoreKey } from './scoring';

const CAVEAT_RATIO = 0.4;
const CAVEAT_MIN_WEIGHT = 8;
const LEAD_RATIO = 0.55;

const topSpecies = [...tsutsuji.species].sort((a, b) => b.count - a.count)[0];

const bloomPhrase = (score: DayScore, item: ScoreItem): string => {
  const { date } = score.outlook;
  const window = bloomWindowOf(date);
  if (window && item.ratio >= 0.8) {
    return `${window.name}の見頃の中心です。日別来訪者数から導いたピークは${formatMonthDay(window.peakKey)}前後`;
  }
  if (window) {
    return `${window.name}の見頃ウィンドウ（${formatMonthDay(window.fromKey)}〜${formatMonthDay(window.toKey)}）に入っています`;
  }
  const next = nearestBloomWindow(date);
  if (!next) return '花の見頃からは外れる時期です';
  return `花の見頃からは外れます。次の${next.name}のピーク（${formatMonthDay(next.peakKey)}）まではあと${daysUntil(date, next.peakKey)}日`;
};

const weatherPhrase = (score: DayScore): string => {
  const { category, source, date } = score.outlook;
  const label = WEATHER_LABEL[category];
  const stat = WEATHER_STATS.find((candidate) => candidate.category === category);
  const cell = score.isWeekend ? stat?.holiday : stat?.weekday;
  const dayType = score.isWeekend ? '休日' : '平日';
  if (source === 'forecast') {
    return `${label}予報。実測では${label}の${dayType}平均は${cell?.average.toLocaleString() ?? '—'}人でした`;
  }
  const normal = normalOf(date.getMonth() + 1);
  const share = Math.round((normal.weatherShare[category] ?? 0) * 100);
  return `${date.getMonth() + 1}月の平年は${label}が${share}%と最も多く、${dayType}平均は${cell?.average.toLocaleString() ?? '—'}人でした`;
};

const PEAK_BAND_LABEL =
  TEMPERATURE_BANDS.find((band) => band.average === TEMPERATURE_PEAK)?.label ?? '';

const temperaturePhrase = (score: DayScore, item: ScoreItem): string => {
  const { tempMax } = score.outlook;
  if (item.ratio >= 0.9) {
    return `最高気温${tempMax}℃は、実測で最も来訪者が多い${PEAK_BAND_LABEL}の帯にあたります`;
  }
  const scale = Math.round(item.ratio * TEMPERATURE_PEAK);
  return `最高気温${tempMax}℃は、気温帯別の実測平均ではおよそ${scale.toLocaleString()}人規模（ピーク${PEAK_BAND_LABEL}の${Math.round(item.ratio * 100)}%）の日です`;
};

const roomPhrase = (score: DayScore): string => {
  const lastYear = lastYearSameDay(score.outlook.date);
  const rank =
    score.roomPercentile < 0.35 ? '空いている方' : score.roomPercentile > 0.75 ? '混む方' : '平均的';
  const previous = lastYear
    ? `前年同日は${lastYear.visitors.toLocaleString()}人。`
    : '';
  return `${previous}予想人出は約${score.expectedVisitors.toLocaleString()}人で、年間365日では${rank}です`;
};

const PHRASE: Record<ScoreKey, (score: DayScore, item: ScoreItem) => string> = {
  bloom: bloomPhrase,
  weather: (score) => weatherPhrase(score),
  temperature: temperaturePhrase,
  room: (score) => roomPhrase(score),
};

const caveatOf = (score: DayScore): string | undefined => {
  const weakest = [...score.items]
    .filter((item) => item.weight >= CAVEAT_MIN_WEIGHT && item.ratio < CAVEAT_RATIO)
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (!weakest) return undefined;

  const lastYear = lastYearSameDay(score.outlook.date);
  switch (weakest.key) {
    case 'bloom':
      return '花の見頃とは重ならない時期です';
    case 'weather':
      return `${WEATHER_LABEL[score.outlook.category]}の予報で、実測でも来訪者は大きく減る天気です`;
    case 'temperature':
      return `最高気温${score.outlook.tempMax}℃は、実測で来訪者が落ち込む気温帯です`;
    case 'room': {
      const expected = `予想人出は約${score.expectedVisitors.toLocaleString()}人`;
      if (score.roomPercentile >= 0.85) {
        const previous = lastYear ? `前年同日は${lastYear.visitors.toLocaleString()}人。` : '';
        return `${previous}${expected}で、年間でも特に混みやすい日です`;
      }
      if (score.roomPercentile >= 0.6) return `${expected}で、年間では混む方に入ります`;
      return `${expected}で、特別に空いている日ではありません`;
    }
  }
};

const purposePhrase = (score: DayScore, preferences: Preferences): string | undefined => {
  const window = bloomWindowOf(score.outlook.date);
  switch (preferences.purpose) {
    case 'tsutsuji':
      return window?.id === 'tsutsuji' && topSpecies
        ? `${topSpecies.species}${topSpecies.count.toLocaleString()}株を中心に、11種${tsutsuji.total.toLocaleString()}株が咲きます`
        : undefined;
    case 'kouyou':
      return window?.id === 'kouyou' ? '嚮陽庭園のモミジとドウダンツツジが色づきます' : undefined;
    case 'lesser-panda':
      return score.outlook.tempMax >= 30
        ? `最高気温${score.outlook.tempMax}℃では、レッサーパンダの屋外展示を見られない場合があります`
        : `最高気温${score.outlook.tempMax}℃なら、レッサーパンダの屋外展示が期待できます`;
    case 'none':
      return undefined;
  }
};

export const buildNarrative = (score: DayScore, preferences: Preferences): string => {
  const ordered = [...score.items].sort((a, b) => b.weight - a.weight);
  const caveat = caveatOf(score);
  const leads = ordered
    .filter((item) => item.ratio >= LEAD_RATIO && item.weight >= CAVEAT_MIN_WEIGHT)
    .slice(0, 2)
    .map((item) => PHRASE[item.key](score, item));

  const highlights = leads.length > 0 ? leads : [PHRASE[ordered[0]?.key ?? 'weather'](score, ordered[0] as ScoreItem)];
  const purpose = purposePhrase(score, preferences);

  const sentences = [...highlights, ...(purpose ? [purpose] : [])].map(
    (sentence) => `${sentence}。`
  );
  if (caveat) sentences.push(`ただし${caveat}。`);
  return sentences.join('');
};
