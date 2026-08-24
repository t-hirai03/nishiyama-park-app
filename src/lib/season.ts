import { ALL_DAYS, WEATHER_LABEL, type WeatherCategory } from './congestion';

const HIGHLIGHT_IDS = ['sakura', 'tsutsuji', 'shinryoku', 'kouyou', 'winter'] as const;
export type HighlightId = (typeof HIGHLIGHT_IDS)[number];

interface Window {
  readonly from: number;
  readonly to: number;
}

export interface Highlight {
  readonly id: HighlightId;
  readonly name: string;
  readonly catchphrase: string;
  readonly description: string;
  readonly evidence: string;
  readonly season: Window;
  readonly peak: Window;
}

const md = (month: number, day: number) => month * 100 + day;

const SAKURA: Highlight = {
  id: 'sakura',
  name: '桜',
  catchphrase: 'ツツジの前に、桜がある',
  description:
    '嚮陽庭園から動物園にかけて桜が咲きます。ツツジほど知られていないぶん、静かに歩ける時期です。',
  evidence: '4月上旬から中旬にかけて人出が増えはじめ、4/12（土）は2,050人を記録しました。',
  season: { from: md(3, 25), to: md(4, 22) },
  peak: { from: md(4, 5), to: md(4, 15) },
};

const TSUTSUJI: Highlight = {
  id: 'tsutsuji',
  name: 'ツツジ',
  catchphrase: '11種50,025株が、一斉に咲く',
  description:
    '西山公園といえばこの時期。ヒラドツツジを中心に11種50,025株が斜面を埋めます。日本の歴史公園100選に選ばれた公園の、一年で最も濃い10日間です。',
  evidence:
    '5/5（月）の4,550人は年間で最も多い日でした。2位の5/4（3,010人）、3位の5/3（2,820人）もこの時期に集中しています。',
  season: { from: md(4, 23), to: md(5, 20) },
  peak: { from: md(5, 1), to: md(5, 10) },
};

const SHINRYOKU: Highlight = {
  id: 'shinryoku',
  name: '新緑と動物園',
  catchphrase: '花のない時期は、レッサーパンダの季節',
  description:
    '花が終わると人出は落ち着きます。この時期こそ、入園無料の西山動物園でレッサーパンダをゆっくり見られるタイミングです。',
  evidence:
    '6〜8月の1日平均は300〜360人で、5月の835人の半分以下。市の推計でも、この時期は来園者に占める動物園目当ての比率が高いと見込まれています。',
  season: { from: md(5, 21), to: md(10, 25) },
  peak: { from: md(6, 1), to: md(9, 30) },
};

const KOUYOU: Highlight = {
  id: 'kouyou',
  name: '紅葉',
  catchphrase: '日本庭園が、一年で一番きれいな週',
  description:
    '嚮陽庭園のモミジとドウダンツツジが色づきます。ツツジの公園として知られていますが、池と木橋のある日本庭園の紅葉は、それだけで見に行く価値があります。',
  evidence:
    '11/16（日）の1,310人を頂点に、11/15〜11/24に人出が集中します。春に次ぐ年2回目の山です。',
  season: { from: md(11, 1), to: md(12, 5) },
  peak: { from: md(11, 14), to: md(11, 25) },
};

const WINTER: Highlight = {
  id: 'winter',
  name: '冬',
  catchphrase: '一年で最も静かな公園',
  description:
    '雪が積もる日もあります。人はほとんどいませんが、動物園は開いています。混雑を一切気にせず過ごしたいならこの時期です。',
  evidence: '1月の1日平均は218人で年間最少。雪の日の平均は170人前後まで落ちます。',
  season: { from: md(12, 6), to: md(3, 24) },
  peak: { from: md(12, 20), to: md(2, 20) },
};

export const HIGHLIGHTS: readonly Highlight[] = [SAKURA, TSUTSUJI, SHINRYOKU, KOUYOU, WINTER];

const inWindow = (value: number, window: Window) =>
  window.from <= window.to
    ? value >= window.from && value <= window.to
    : value >= window.from || value <= window.to;

export const highlightOf = (date: Date): Highlight => {
  const value = md(date.getMonth() + 1, date.getDate());
  return HIGHLIGHTS.find((highlight) => inWindow(value, highlight.season)) ?? WINTER;
};

const bloomScoreOf = (date: Date): number => {
  const value = md(date.getMonth() + 1, date.getDate());
  const highlight = highlightOf(date);
  if (highlight.id === 'shinryoku' || highlight.id === 'winter') return 12;
  if (inWindow(value, highlight.peak)) return 40;
  return 26;
};

const WEATHER_SCORE: Record<WeatherCategory, number> = {
  sunny: 30,
  cloudy: 21,
  rain: 6,
  snow: 3,
};

const comfortTable = (() => {
  const buckets = new Map<number, number[]>();
  for (const day of ALL_DAYS) {
    const bucket = Math.floor(day.tempMax / 5) * 5;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), day.visitors]);
  }
  const averages = new Map<number, number>();
  for (const [bucket, values] of buckets) {
    averages.set(bucket, values.reduce((sum, v) => sum + v, 0) / values.length);
  }
  const peak = Math.max(...averages.values());
  return { averages, peak };
})();

const comfortScoreOf = (tempMax: number): number => {
  const bucket = Math.floor(tempMax / 5) * 5;
  const average = comfortTable.averages.get(bucket);
  if (average === undefined) return 6;
  return Math.round((average / comfortTable.peak) * 20);
};

const roomScoreOf = (expectedVisitors: number): number => {
  if (expectedVisitors >= 2000) return 0;
  if (expectedVisitors >= 1000) return 3;
  if (expectedVisitors >= 600) return 6;
  return 10;
};

export interface ScoreBreakdown {
  readonly bloom: number;
  readonly weather: number;
  readonly comfort: number;
  readonly room: number;
}

export interface VisitScore {
  readonly total: number;
  readonly breakdown: ScoreBreakdown;
  readonly highlight: Highlight;
  readonly verdict: string;
}

const verdictOf = (total: number): string => {
  if (total >= 80) return '文句なしの当たり日';
  if (total >= 65) return 'かなり good';
  if (total >= 50) return 'わるくない';
  if (total >= 35) return 'ふつう';
  return '別の日をおすすめ';
};

export const scoreVisit = (
  date: Date,
  weatherCategory: WeatherCategory,
  tempMax: number,
  expectedVisitors: number
): VisitScore => {
  const breakdown: ScoreBreakdown = {
    bloom: bloomScoreOf(date),
    weather: WEATHER_SCORE[weatherCategory],
    comfort: comfortScoreOf(tempMax),
    room: roomScoreOf(expectedVisitors),
  };
  const total = breakdown.bloom + breakdown.weather + breakdown.comfort + breakdown.room;
  return { total, breakdown, highlight: highlightOf(date), verdict: verdictOf(total) };
};

export const SCORE_LEGEND = [
  { key: 'bloom', label: '見どころ', max: 40, note: '見頃の中心なら満点' },
  { key: 'weather', label: '天気', max: 30, note: WEATHER_LABEL.sunny + 'が最も高い' },
  { key: 'comfort', label: '気温の快適さ', max: 20, note: '実データの気温帯別来訪者数から算出' },
  { key: 'room', label: 'ゆとり', max: 10, note: '混みすぎる日は下がる' },
] as const;

const decode = (value: number) => ({ month: Math.floor(value / 100), day: value % 100 });

export const daysUntilPeak = (from: Date, highlight: Highlight): number => {
  const { month, day } = decode(highlight.peak.from);
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const candidate = new Date(from.getFullYear(), month - 1, day);
  if (candidate < base) candidate.setFullYear(candidate.getFullYear() + 1);
  return Math.round((candidate.getTime() - base.getTime()) / 86_400_000);
};

export const formatWindow = (window: Window): string => {
  const start = decode(window.from);
  const end = decode(window.to);
  return `${start.month}/${start.day}〜${end.month}/${end.day}`;
};

const PHOTOGENIC: readonly HighlightId[] = ['tsutsuji', 'kouyou'];

export const isPhotogenic = (highlight: Highlight) => PHOTOGENIC.includes(highlight.id);

export const featuredHighlight = (date: Date): Highlight => {
  const current = highlightOf(date);
  if (isPhotogenic(current)) return current;
  const upcoming = HIGHLIGHTS.filter(isPhotogenic).sort(
    (a, b) => daysUntilPeak(date, a) - daysUntilPeak(date, b)
  );
  return upcoming[0] ?? current;
};
