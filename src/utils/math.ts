export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export const roundedMean = (values: readonly number[]): number => Math.round(mean(values));

/** 偶数個のときは上側の値を返す。季節の中央値はこの定義で実測値と一致させている */
export const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};
