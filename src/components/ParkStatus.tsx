import { useEffect, useState } from 'react';
import { WeatherIcon } from './WeatherIcon';
import { WEATHER_LABEL, formatDateLabel, isWeekendDate } from '../lib/days';
import { fetchForecast, outlookFor, type ForecastMap } from '../lib/forecast';
import { yearStats } from '../lib/insights';
import { DEFAULT_PREFERENCES, scoreDay } from '../lib/scoring';

/** 365日の実測を4段階に切って言い換える。点数は出さない */
const CROWD_LEVELS = [
  { upTo: 0.25, label: '空いています', tone: 'text-emerald-700' },
  { upTo: 0.55, label: 'ゆとりがあります', tone: 'text-emerald-700' },
  { upTo: 0.85, label: 'やや多めです', tone: 'text-stone-700' },
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

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:p-8">{children}</div>
);

const Bar = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded bg-stone-200 ${className}`} />
);

const Skeleton = () => (
  <Shell>
    <Bar className="h-3 w-28" />
    <Bar className="mt-5 h-10 w-64" />
    <Bar className="mt-6 h-14 w-40" />
    <div className="mt-7 grid grid-cols-2 gap-6 border-t border-stone-200 pt-6">
      <Bar className="h-9" />
      <Bar className="h-9" />
    </div>
    <p className="mt-5 text-xs text-stone-400">天気予報を読み込んでいます</p>
  </Shell>
);

const Figure = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div>
    <dt className="text-xs text-stone-500">{label}</dt>
    <dd className="mt-1 text-xl font-bold tracking-tight text-stone-900 tabular-nums">
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

  // 平年値を先に描いてから予報で差し替えると数字が飛ぶため、確定まで骨組みを出す
  if (!settled) return <Skeleton />;

  const { outlook, expectedVisitors, roomPercentile } = scoreDay(
    outlookFor(today, forecast),
    DEFAULT_PREFERENCES
  );
  const level = crowdLevel(roomPercentile);

  return (
    <Shell>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-xs font-medium tracking-[0.2em] text-emerald-700 uppercase">Today</p>
        <p className="text-sm text-stone-500">
          {formatDateLabel(outlook.date)}
          {isWeekendDate(outlook.date) && '・週末'}
        </p>
      </div>

      <p
        className={`mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl ${level.tone}`}
      >
        {level.label}
      </p>

      <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <p className="text-xs text-stone-500">予想人出</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-stone-900 tabular-nums sm:text-5xl">
            <span className="mr-1 text-lg font-medium text-stone-500">約</span>
            {expectedVisitors.toLocaleString()}
            <span className="ml-1 text-lg font-medium text-stone-500">人</span>
          </p>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <WeatherIcon category={outlook.category} className="h-10 w-10 text-stone-400" />
          <div>
            <p className="text-lg font-bold text-stone-900">{WEATHER_LABEL[outlook.category]}</p>
            <p className="text-xs text-stone-500 tabular-nums">
              {outlook.tempMax}℃ / {outlook.tempMin}℃
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-stone-200 pt-6">
        <Figure label="年間平均との比" value={ratioLabel(expectedVisitors / yearStats.average)} />
        <Figure
          label="365日中の位置"
          value={`下から${Math.round(roomPercentile * 100)}%`}
          note="（静かな方）"
        />
        <Figure
          label="年間平均"
          value={Math.round(yearStats.average).toLocaleString()}
          note="人（実測）"
        />
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-stone-500">
        {outlook.source === 'forecast'
          ? '天気は Open-Meteo の予報。'
          : '天気予報が取得できなかったため、月別の平年値で計算しています。'}
        人出は令和7年度の日別実測365日を曜日と天気で補正した推計です。
      </p>
    </Shell>
  );
};
