/**
 * UIなしで主張の出力を確認する。
 *   npm run check:claim
 * 天気予報は使わず平年値で計算するため、実行日によらず同じ結果になる。
 */
import { buildClaim } from '../src/lib/claim';
import { SEASON_FACTS, SEASONS } from '../src/lib/season';
import { DEFAULT_PREFERENCES, type Preferences } from '../src/lib/scoring';
import { KOUYOU_TREND, TSUTSUJI_TREND, formatChange } from '../src/lib/trend';

const BASE_DATE = new Date(2026, 8, 6);

const CASES: readonly { readonly label: string; readonly preferences: Preferences }[] = [
  { label: '既定（特になし・大人・県内・優先度50）', preferences: DEFAULT_PREFERENCES },
  {
    label: '子ども連れ・県外車・空いてる日重視',
    preferences: { ...DEFAULT_PREFERENCES, companion: 'kids', transport: 'car', priority: 85 },
  },
  {
    label: 'ツツジ目的・見頃重視',
    preferences: { ...DEFAULT_PREFERENCES, purpose: 'tsutsuji', priority: 10 },
  },
  {
    label: '紅葉目的・県外鉄道',
    preferences: { ...DEFAULT_PREFERENCES, purpose: 'kouyou', transport: 'train' },
  },
  {
    label: 'レッサーパンダ目的・高齢者連れ',
    preferences: { ...DEFAULT_PREFERENCES, purpose: 'lesser-panda', companion: 'seniors' },
  },
];

console.log('=== 実測から動かない事実 ===');
SEASONS.forEach((season) => {
  const facts = SEASON_FACTS[season.id];
  console.log(
    `${season.label}  快適日 ${String(facts.comfortableDays).padStart(2)}/${facts.totalDays}日  ` +
      `中央値 ${String(facts.medianVisitors).padStart(4)}人  ピーク ${facts.peak?.date ?? '—'} (${facts.peak?.visitors ?? 0}人)`
  );
});
console.log(
  `動物園18年 5月 ${TSUTSUJI_TREND ? formatChange(TSUTSUJI_TREND.change) : '—'} / ` +
    `11月 ${KOUYOU_TREND ? formatChange(KOUYOU_TREND.change) : '—'}`
);

CASES.forEach(({ label, preferences }) => {
  const claim = buildClaim(BASE_DATE, preferences, null);
  console.log(`\n=== ${label} ===`);
  console.log(`主張  ${claim.headline}`);
  console.log(`数字  ${claim.figure} — ${claim.figureNote}`);
  console.log(`根拠  ${claim.reason}`);
  console.log(
    `順位  ${claim.seasons.map((season) => `${season.label}${season.total}`).join('  ')}`
  );
});
