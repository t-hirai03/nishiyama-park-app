/**
 * URL状態の往復を確認する。
 *   npm run check:url
 * 「操作した結果をURLで送れて、受け取った人が続きから操作できる」ことが
 * Webアプリの条件なので、ここが壊れると企画の根拠が崩れる。
 */
import {
  DEFAULT_STATE,
  isDefaultState,
  parsePlannerState,
  serializePlannerState,
  type PlannerState,
} from '../src/lib/url-state';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown): void => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) console.log(`     期待 ${JSON.stringify(expected)}\n     実際 ${JSON.stringify(actual)}`);
};

const roundTrip = (state: PlannerState): PlannerState =>
  parsePlannerState(serializePlannerState(state));

const cases: readonly { label: string; state: PlannerState }[] = [
  { label: '既定', state: DEFAULT_STATE },
  {
    label: '全項目を変更',
    state: {
      preferences: { purpose: 'kouyou', transport: 'train', companion: 'kids', priority: 85 },
      period: 'year',
    },
  },
  {
    label: '一部だけ変更',
    state: { preferences: { ...DEFAULT_STATE.preferences, priority: 0 }, period: 'month' },
  },
];

cases.forEach(({ label, state }) => check(`往復: ${label}`, roundTrip(state), state));

check('既定はクエリを出さない', serializePlannerState(DEFAULT_STATE), '');
check('既定判定', isDefaultState(DEFAULT_STATE), true);
check(
  '既定以外は落とさない',
  serializePlannerState({
    preferences: { ...DEFAULT_STATE.preferences, purpose: 'tsutsuji' },
    period: DEFAULT_STATE.period,
  }),
  'purpose=tsutsuji'
);

// 壊れた入力でも既定に落ちる
check('不正な値は既定に落ちる', parsePlannerState('?purpose=nope&period=xxx'), DEFAULT_STATE);
check(
  '優先度は0-100に丸める',
  parsePlannerState('?priority=999').preferences.priority,
  100
);
check('優先度が数値でなければ既定', parsePlannerState('?priority=abc').preferences.priority, 50);
check('空のクエリ', parsePlannerState(''), DEFAULT_STATE);

if (failures > 0) throw new Error(`${failures}件 失敗`);
console.log('\nすべて通過');
