import { useEffect, useState } from 'react';
import { WEATHER_LABEL } from '../lib/days';
import { fetchForecast, outlookFor } from '../lib/forecast';
import { DEFAULT_PREFERENCES, scoreDay } from '../lib/scoring';
import type { ForecastMap } from '../types/visitors';
import { formatShortDate, isWeekendDate, startOfDay } from '../utils/date';
import { WeatherIcon } from './WeatherIcon';

/** 365日の実測を4段階に切って言い換える。点数は出さない */
const CROWD_LEVELS = [
  { upTo: 0.25, label: '空いています', tone: 'text-brand-700' },
  { upTo: 0.55, label: 'ゆとりあり', tone: 'text-brand-700' },
  { upTo: 0.85, label: 'やや多め', tone: 'text-stone-700' },
  { upTo: 1.01, label: '混みます', tone: 'text-rose-700' },
] as const;

const crowdLevel = (percentile: number) =>
  CROWD_LEVELS.find((level) => percentile < level.upTo) ?? CROWD_LEVELS[3];

const Skeleton = () => (
  <div className="flex items-center gap-3">
    <div className="h-5 w-5 animate-pulse rounded-full bg-stone-200" />
    <div className="h-3.5 w-48 animate-pulse rounded bg-stone-200" />
  </div>
);

export const ParkStatus = () => {
  const [today] = useState(() => startOfDay(new Date()));
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

  const { outlook, roomPercentile } = scoreDay(outlookFor(today, forecast), DEFAULT_PREFERENCES);
  const level = crowdLevel(roomPercentile);

  return (
    <div className="flex max-w-full items-center gap-2.5 px-2.5 py-1.5">
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
      </span>
    </div>
  );
};
