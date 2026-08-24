import { useEffect, useState } from 'react';
import { predict, WEATHER_LABEL, type Prediction } from '../lib/congestion';
import { fetchForecast, type ForecastDay } from '../lib/forecast';
import {
  daysUntilPeak,
  featuredHighlight,
  formatWindow,
  highlightOf,
  scoreVisit,
  SCORE_LEGEND,
  type VisitScore,
} from '../lib/season';
import { WeatherIcon } from './WeatherIcon';

interface RankedDay {
  readonly forecast: ForecastDay;
  readonly prediction: Prediction;
  readonly score: VisitScore;
}

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly ranked: readonly RankedDay[];
      readonly today: Date;
    };

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'] as const;

const formatDate = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY[date.getDay()] ?? ''})`;

const rank = (day: ForecastDay): RankedDay => {
  const prediction = predict({
    month: day.date.getMonth() + 1,
    weatherCategory: day.category,
    tempMax: day.tempMax,
    isWeekend: day.date.getDay() === 0 || day.date.getDay() === 6,
  });
  return {
    forecast: day,
    prediction,
    score: scoreVisit(day.date, day.category, day.tempMax, prediction.median),
  };
};

const ScoreMeter = ({ score }: { score: VisitScore }) => (
  <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full" role="presentation">
    <rect x="0" y="0" width="100" height="6" fill="#e7e5e4" />
    <rect x="0" y="0" width={score.total} height="6" fill="#15803d" />
  </svg>
);

const Breakdown = ({ score }: { score: VisitScore }) => (
  <dl className="mt-6 space-y-2.5">
    {SCORE_LEGEND.map((item) => {
      const value = score.breakdown[item.key];
      return (
        <div key={item.key} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
          <dt className="text-xs text-stone-600">{item.label}</dt>
          <dd>
            <svg
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              className="h-2 w-full"
              role="img"
              aria-label={`${item.label} ${value}点（満点${item.max}点）`}
            >
              <rect x="0" y="0" width="100" height="8" fill="#f5f5f4" />
              <rect x="0" y="0" width={(value / item.max) * 100} height="8" fill="#4d7c0f" />
            </svg>
          </dd>
          <dd className="text-right text-xs tabular-nums text-stone-500">
            {value} / {item.max}
          </dd>
        </div>
      );
    })}
  </dl>
);

export const VisitPlanner = () => {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchForecast()
      .then((days) => {
        if (cancelled) return;
        setState(
          days
            ? {
                status: 'ready',
                ranked: [...days.map(rank)].sort((a, b) => b.score.total - a.score.total),
                today: days[0]?.date ?? new Date(),
              }
            : { status: 'error' }
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <p className="animate-pulse rounded-3xl bg-white/70 px-6 py-20 text-center text-stone-400 ring-1 ring-stone-200">
        今週の天気から計算しています
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <p className="rounded-3xl bg-white px-6 py-16 text-center text-stone-600 ring-1 ring-stone-200">
        天気予報を取得できませんでした。時間をおいて再読み込みしてください。
      </p>
    );
  }

  const [best, ...rest] = state.ranked;
  if (!best) return null;

  const current = highlightOf(state.today);
  const featured = featuredHighlight(state.today);
  const untilFeatured = daysUntilPeak(state.today, featured);

  return (
    <div className="space-y-5">
      <p className="text-stone-600">
        いまは<strong className="font-semibold text-stone-900">{current.name}</strong>の時期です。
        {featured.id === current.id
          ? `見頃の中心は${formatWindow(featured.peak)}。`
          : `次の大きな見頃は${featured.name}で、中心の${formatWindow(featured.peak)}まであと${untilFeatured}日。`}
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
      <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200">
        <div className="p-7 sm:p-8">
          <p className="text-xs font-medium tracking-[0.18em] text-emerald-700 uppercase">
            Best day this week
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                {formatDate(best.forecast.date)}
              </p>
              <p className="mt-2 text-lg font-medium text-emerald-800">{best.score.verdict}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums text-stone-900">
                {best.score.total}
                <span className="ml-0.5 text-base font-medium text-stone-400">/100</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ScoreMeter score={best.score} />
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm">
            <li className="flex items-center gap-2">
              <WeatherIcon category={best.forecast.category} className="h-5 w-5 text-stone-400" />
              <span className="text-stone-700">{WEATHER_LABEL[best.forecast.category]}</span>
            </li>
            <li className="tabular-nums text-stone-700">
              {best.forecast.tempMax}℃ / {best.forecast.tempMin}℃
            </li>
            <li className="text-stone-700">
              予想人出 約 {best.prediction.median.toLocaleString()} 人
            </li>
          </ul>

          <Breakdown score={best.score} />

          <details className="mt-6 border-t border-stone-100 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-stone-700">
              人出の予想根拠（似た過去 {best.prediction.samples.length} 日）
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              令和7年度の日別来訪者数365日から「{best.prediction.criteria}
              」に当てはまる日を抜き出し、その中央値を使っています。
            </p>
          </details>
        </div>
      </article>

      <ol className="space-y-2">
        {rest.map((day, index) => (
          <li
            key={day.forecast.date.toISOString()}
            className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3.5 ring-1 ring-stone-200"
          >
            <span className="w-5 text-sm tabular-nums text-stone-400">{index + 2}</span>
            <span className="w-20 text-sm font-medium tabular-nums text-stone-900">
              {formatDate(day.forecast.date)}
            </span>
            <WeatherIcon category={day.forecast.category} className="h-5 w-5 shrink-0 text-stone-400" />
            <span className="hidden w-28 text-sm text-stone-500 sm:inline">{day.score.verdict}</span>
            <span className="flex-1">
              <ScoreMeter score={day.score} />
            </span>
            <span className="w-8 text-right text-sm font-semibold tabular-nums text-stone-700">
              {day.score.total}
            </span>
          </li>
        ))}
      </ol>
      </div>
    </div>
  );
};
