/** 要素があれば外し、無ければ足した新しい Set を返す。React の state 更新用 */
export const toggled = <T>(current: ReadonlySet<T>, item: T): ReadonlySet<T> => {
  const next = new Set(current);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
};
