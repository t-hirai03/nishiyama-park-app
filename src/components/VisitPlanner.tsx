import { useEffect, useMemo, useState } from 'react';
import { WEATHER_LABEL, formatDateLabel, formatShortDate, toIsoDate } from '../lib/days';
import { holidayNameOf } from '../lib/holidays';
import { PERIODS, datesOf, describePeriod, type PeriodId } from '../lib/period';
import { buildOutlooks, fetchForecast, type ForecastMap } from '../lib/forecast';
import {
  COMPANIONS,
  DEFAULT_PREFERENCES,
  PURPOSES,
  TRANSPORTS,
  rankDays,
  type DayScore,
  type Preferences,
} from '../lib/scoring';
import { buildNarrative } from '../lib/narrative';
import { WeatherIcon } from './WeatherIcon';

const LIST_LIMIT = 12;

const resolveBaseDate = (): Date => {
  const raw = new URLSearchParams(window.location.search).get('date');
  if (raw) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

const Choice = <T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
}) => (
  <fieldset>
    <legend className="text-xs font-medium tracking-wide text-stone-500">{legend}</legend>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label
          key={option.id}
          className="cursor-pointer scroll-mt-24 rounded-full px-3.5 py-1.5 text-sm ring-1 ring-stone-200 transition duration-150 has-[:checked]:bg-emerald-700 has-[:checked]:text-white has-[:checked]:ring-emerald-700 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-700 hover:bg-stone-100 has-[:checked]:hover:bg-emerald-700"
        >
          <input
            type="radio"
            name={legend}
            className="sr-only"
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

const ScoreMeter = ({ total }: { total: number }) => (
  <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full" role="presentation">
    <rect x="0" y="0" width="100" height="6" fill="#e7e5e4" />
    <rect x="0" y="0" width={Math.max(total, 0)} height="6" fill="#15803d" />
  </svg>
);

const Breakdown = ({ score }: { score: DayScore }) => (
  <dl className="mt-5 space-y-2.5">
    {score.items.map((item) => (
      <div key={item.key} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3">
        <dt className="text-xs text-stone-600">{item.label}</dt>
        <dd>
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="h-2 w-full"
            role="img"
            aria-label={`${item.label} ${item.points.toFixed(0)}点（配点${item.weight.toFixed(0)}点）`}
          >
            <rect x="0" y="0" width="100" height="8" fill="#f5f5f4" />
            <rect x="0" y="0" width={item.ratio * 100} height="8" fill="#4d7c0f" />
          </svg>
        </dd>
        <dd className="text-right text-xs tabular-nums text-stone-500">
          {item.points.toFixed(0)} / {item.weight.toFixed(0)}
        </dd>
      </div>
    ))}
  </dl>
);

const SourceBadge = ({ score }: { score: DayScore }) => (
  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
    {score.outlook.source === 'forecast' ? '天気予報' : '平年値'}
  </span>
);

const DayHeadline = ({ score }: { score: DayScore }) => {
  const holiday = holidayNameOf(score.outlook.date);
  return (
    <span>
      {formatDateLabel(score.outlook.date)}
      {holiday && <span className="ml-1.5 text-sm font-medium text-rose-700">{holiday}</span>}
    </span>
  );
};

const Facts = ({ score }: { score: DayScore }) => (
  <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
    <li className="flex items-center gap-2">
      <WeatherIcon category={score.outlook.category} className="h-5 w-5 text-stone-400" />
      <span className="text-stone-700">{WEATHER_LABEL[score.outlook.category]}</span>
    </li>
    <li className="tabular-nums text-stone-700">
      {score.outlook.tempMax}℃ / {score.outlook.tempMin}℃
    </li>
    <li className="text-stone-700">予想人出 約 {score.expectedVisitors.toLocaleString()} 人</li>
    <li>
      <SourceBadge score={score} />
    </li>
  </ul>
);

const BestCard = ({ score, preferences }: { score: DayScore; preferences: Preferences }) => (
  <article className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-8">
    <p className="text-xs font-medium tracking-[0.18em] text-emerald-700 uppercase">
      Best day for you
    </p>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <p className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
        <DayHeadline score={score} />
      </p>
      <p className="text-4xl font-bold tabular-nums text-stone-900">
        {score.total}
        <span className="ml-0.5 text-base font-medium text-stone-400">/100</span>
      </p>
    </div>
    <div className="mt-4">
      <ScoreMeter total={score.total} />
    </div>
    <p className="mt-5 leading-relaxed text-stone-700">{buildNarrative(score, preferences)}</p>
    <Facts score={score} />
    <Breakdown score={score} />
  </article>
);

const RunnerUpCard = ({
  score,
  rank,
  preferences,
}: {
  score: DayScore;
  rank: number;
  preferences: Preferences;
}) => (
  <article className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-lg font-bold text-stone-900">
        <span className="mr-2 text-sm font-medium text-stone-400">{rank}位</span>
        <DayHeadline score={score} />
      </p>
      <p className="text-2xl font-bold tabular-nums text-stone-900">{score.total}</p>
    </div>
    <div className="mt-3">
      <ScoreMeter total={score.total} />
    </div>
    <p className="mt-4 text-sm leading-relaxed text-stone-600">
      {buildNarrative(score, preferences)}
    </p>
    <Facts score={score} />
  </article>
);

const ListRow = ({ score, rank }: { score: DayScore; rank: number }) => (
  <li className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 ring-1 ring-stone-200">
    <span className="w-8 text-sm tabular-nums text-stone-400">{rank}</span>
    <span className="w-24 text-sm font-medium tabular-nums text-stone-900">
      {formatShortDate(score.outlook.date)}
    </span>
    <WeatherIcon category={score.outlook.category} className="h-5 w-5 shrink-0 text-stone-400" />
    <span className="hidden w-24 text-sm tabular-nums text-stone-500 sm:inline">
      {score.outlook.tempMax}℃
    </span>
    <span className="flex-1">
      <ScoreMeter total={score.total} />
    </span>
    <span className="w-8 text-right text-sm font-semibold tabular-nums text-stone-700">
      {score.total}
    </span>
  </li>
);

const Skeleton = () => (
  <p className="animate-pulse rounded-3xl bg-white/70 px-6 py-24 text-center text-stone-400 ring-1 ring-stone-200">
    おすすめの日を計算しています
  </p>
);

export const VisitPlanner = () => {
  const [baseDate, setBaseDate] = useState<Date | null>(null);
  const [forecast, setForecast] = useState<ForecastMap | null>(null);
  const [period, setPeriod] = useState<PeriodId>('week');
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setBaseDate(resolveBaseDate());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchForecast().then((map) => {
      if (!cancelled) setForecast(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dates = useMemo(() => (baseDate ? datesOf(period, baseDate) : []), [period, baseDate]);

  const ranked = useMemo(
    () => (dates.length > 0 ? rankDays(buildOutlooks(dates, forecast), preferences) : []),
    [dates, forecast, preferences]
  );

  useEffect(() => {
    setExpanded(false);
  }, [period, preferences]);

  if (!baseDate || ranked.length === 0) return <Skeleton />;

  const [best, second, third, ...rest] = ranked;
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPreferences((current) => ({ ...current, [key]: value }));
  const visibleRest = expanded ? rest : rest.slice(0, LIST_LIMIT);
  const isOverridden = toIsoDate(baseDate) !== toIsoDate(new Date());

  return (
    <div className="space-y-6">
      {best && <BestCard score={best} preferences={preferences} />}

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:p-7">
        <h3 className="text-sm font-bold text-stone-900">条件を変えると、おすすめの日が変わります</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Choice
            legend="目的"
            options={PURPOSES}
            value={preferences.purpose}
            onChange={(value) => update('purpose', value)}
          />
          <Choice
            legend="訪問可能期間"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />
          <Choice
            legend="出発地・交通手段"
            options={TRANSPORTS}
            value={preferences.transport}
            onChange={(value) => update('transport', value)}
          />
          <Choice
            legend="同行者"
            options={COMPANIONS}
            value={preferences.companion}
            onChange={(value) => update('companion', value)}
          />
        </div>

        <div className="mt-6 border-t border-stone-100 pt-5">
          <label htmlFor="priority" className="text-xs font-medium tracking-wide text-stone-500">
            優先度
          </label>
          <input
            id="priority"
            type="range"
            min={0}
            max={100}
            step={5}
            value={preferences.priority}
            onChange={(event) => update('priority', Number(event.target.value))}
            className="mt-2 w-full accent-emerald-700"
          />
          <div className="flex justify-between text-xs text-stone-500">
            <span>見頃重視</span>
            <span>空いている日重視</span>
          </div>
        </div>

        <p className="mt-5 text-xs text-stone-500">
          対象期間 {describePeriod(dates)}
          {isOverridden && `　基準日 ${toIsoDate(baseDate)}（デモ表示）`}
        </p>
      </section>

      {(second || third) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {second && <RunnerUpCard score={second} rank={2} preferences={preferences} />}
          {third && <RunnerUpCard score={third} rank={3} preferences={preferences} />}
        </div>
      )}

      {visibleRest.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-stone-900">4位以降</h3>
          <ol className="space-y-2">
            {visibleRest.map((score, index) => (
              <ListRow key={toIsoDate(score.outlook.date)} score={score} rank={index + 4} />
            ))}
          </ol>
          {!expanded && rest.length > LIST_LIMIT && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 w-full rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-700 ring-1 ring-stone-200 transition duration-150 hover:bg-stone-100"
            >
              残り {rest.length - LIST_LIMIT} 日を表示
            </button>
          )}
        </div>
      )}
    </div>
  );
};
