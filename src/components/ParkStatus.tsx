import { useEffect, useRef, useState } from 'react';
import { WeatherIcon } from './WeatherIcon';
import {
  DATA_AREA,
  DATA_FISCAL_YEAR,
  DATA_NOTE,
  WEATHER_LABEL,
  formatShortDate,
  isWeekendDate,
} from '../lib/days';
import { fetchForecast, outlookFor, type ForecastMap } from '../lib/forecast';
import { yearStats } from '../lib/insights';
import { DEFAULT_PREFERENCES, scoreDay } from '../lib/scoring';

/** 365日の実測を4段階に切って言い換える。点数は出さない */
const CROWD_LEVELS = [
  { upTo: 0.25, label: '空いています', tone: 'text-brand-700' },
  { upTo: 0.55, label: 'ゆとりあり', tone: 'text-brand-700' },
  { upTo: 0.85, label: 'やや多め', tone: 'text-stone-700' },
  { upTo: 1.01, label: '混みます', tone: 'text-rose-700' },
] as const;

const crowdLevel = (percentile: number) =>
  CROWD_LEVELS.find((level) => percentile < level.upTo) ?? CROWD_LEVELS[3];

const ratioLabel = (value: number) => {
  const tenths = Math.round(value * 10);
  if (tenths <= 0) return '1割未満';
  if (tenths === 10) return 'ほぼ同じ';
  if (tenths > 10) return `約${(tenths / 10).toFixed(1)}倍`;
  return `約${tenths}割`;
};

const Skeleton = () => (
  <div className="flex items-center gap-3">
    <div className="h-5 w-5 animate-pulse rounded-full bg-stone-200" />
    <div className="h-3.5 w-48 animate-pulse rounded bg-stone-200" />
  </div>
);

const Figure = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div>
    <dt className="text-xs text-stone-500">{label}</dt>
    <dd className="mt-1 text-lg font-bold tracking-tight text-stone-900 tabular-nums">
      {value}
      {note && <span className="ml-1 text-xs font-normal whitespace-nowrap text-stone-500">{note}</span>}
    </dd>
  </div>
);

export const ParkStatus = () => {
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [forecast, setForecast] = useState<ForecastMap | null>(null);
  const [settled, setSettled] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchForecast()
      .then((result) => {
        if (active) setForecast(result);
      })
      .finally(() => {
        if (active) setSettled(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // ヘッダーから垂れ下がる形なので、外側を触ったら閉じないと地図の操作を邪魔する
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // 平年値を先に描いてから予報で差し替えると数字が飛ぶため、確定まで骨組みを出す
  if (!settled) return <Skeleton />;

  const { outlook, expectedVisitors, roomPercentile } = scoreDay(
    outlookFor(today, forecast),
    DEFAULT_PREFERENCES
  );
  const level = crowdLevel(roomPercentile);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex max-w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition duration-150 hover:bg-stone-100"
      >
        <WeatherIcon category={outlook.category} className="h-5 w-5 shrink-0 text-stone-400" />
        <span className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
          <span className="text-xs text-stone-500 tabular-nums">
            {formatShortDate(outlook.date)}
            {isWeekendDate(outlook.date) && '・週末'}
          </span>
          <span className={`text-sm font-bold ${level.tone}`}>{level.label}</span>
          <span className="hidden text-xs text-stone-500 sm:inline">
            {WEATHER_LABEL[outlook.category]} {outlook.tempMax}℃
          </span>
          <span className="text-sm font-bold text-stone-900 tabular-nums">
            <span className="text-xs font-normal text-stone-500">人出 約</span>
            {expectedVisitors.toLocaleString()}
            <span className="text-xs font-normal text-stone-500">人</span>
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-1000 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-lg ring-1 ring-stone-200">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Figure label="年間平均との比" value={ratioLabel(expectedVisitors / yearStats.average)} />
            <Figure
              label="365日中の位置"
              value={`下から${Math.round(roomPercentile * 100)}%`}
              note="（静かな方）"
            />
            <Figure label="最高/最低" value={`${outlook.tempMax}/${outlook.tempMin}`} note="℃" />
            <Figure
              label="年間平均"
              value={Math.round(yearStats.average).toLocaleString()}
              note="人（実測）"
            />
          </dl>
          <div className="mt-4 space-y-2 border-t border-stone-200 pt-3">
            <p className="text-xs leading-relaxed text-stone-500">
              人出は{DATA_FISCAL_YEAR}の日別実測365日から、曜日と天気の影響を取り除いた季節成分に
              曜日係数と天気係数を掛けた推計です。
            </p>
            <p className="text-xs leading-relaxed text-stone-500">
              対象は<strong className="font-semibold text-stone-700">{DATA_AREA}</strong>。{DATA_NOTE}
            </p>
            <p className="text-xs leading-relaxed text-stone-500">
              {outlook.source === 'forecast'
                ? '天気は Open-Meteo の予報です。'
                : '天気予報が取得できなかったため、月別の平年値で計算しています。'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
