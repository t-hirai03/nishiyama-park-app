export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const toNumbers = (value: unknown): readonly number[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'number') ? value : null;

export const toStrings = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;

/** 文字列が選択肢のどれかに当たるか。URLやイベントから来た値を絞り込む */
export const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && options.some((option) => option === value);
