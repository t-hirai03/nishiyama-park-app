import { PERIODS, type PeriodId } from './period';
import {
  COMPANIONS,
  DEFAULT_PREFERENCES,
  PURPOSES,
  TRANSPORTS,
  type CompanionId,
  type Preferences,
  type PurposeId,
  type TransportId,
} from './scoring';

/**
 * 条件をURLに持たせる。サーバー保存はしない。
 * これがないと、出した答えを他人に送れず、リロードで消える。
 */
export interface PlannerState {
  readonly preferences: Preferences;
  readonly period: PeriodId;
}

export const DEFAULT_PERIOD: PeriodId = 'week';

export const DEFAULT_STATE: PlannerState = {
  preferences: DEFAULT_PREFERENCES,
  period: DEFAULT_PERIOD,
};

const PARAM = {
  purpose: 'purpose',
  transport: 'transport',
  companion: 'companion',
  period: 'period',
  priority: 'priority',
} as const;

const idOf = <T extends string>(
  options: readonly { readonly id: T }[],
  value: string | null,
  fallback: T
): T => options.find((option) => option.id === value)?.id ?? fallback;

const priorityOf = (value: string | null, fallback: number): number => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed / 5) * 5, 0), 100);
};

export const parsePlannerState = (search: string): PlannerState => {
  const params = new URLSearchParams(search);
  const base = DEFAULT_STATE;
  return {
    preferences: {
      purpose: idOf<PurposeId>(PURPOSES, params.get(PARAM.purpose), base.preferences.purpose),
      transport: idOf<TransportId>(
        TRANSPORTS,
        params.get(PARAM.transport),
        base.preferences.transport
      ),
      companion: idOf<CompanionId>(
        COMPANIONS,
        params.get(PARAM.companion),
        base.preferences.companion
      ),
      priority: priorityOf(params.get(PARAM.priority), base.preferences.priority),
    },
    period: idOf<PeriodId>(PERIODS, params.get(PARAM.period), base.period),
  };
};

/** 既定値と同じ項目は落とす。共有されるURLを読める長さに保つため */
export const serializePlannerState = (state: PlannerState): string => {
  const params = new URLSearchParams();
  const { preferences } = state;
  const base = DEFAULT_STATE.preferences;
  if (preferences.purpose !== base.purpose) params.set(PARAM.purpose, preferences.purpose);
  if (preferences.transport !== base.transport) params.set(PARAM.transport, preferences.transport);
  if (preferences.companion !== base.companion) params.set(PARAM.companion, preferences.companion);
  if (preferences.priority !== base.priority) {
    params.set(PARAM.priority, String(preferences.priority));
  }
  if (state.period !== DEFAULT_STATE.period) params.set(PARAM.period, state.period);
  return params.toString();
};

export const isDefaultState = (state: PlannerState): boolean =>
  serializePlannerState(state).length === 0;
