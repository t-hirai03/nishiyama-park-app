/** CSS変数を実際の色に解決する。DOMが必要なのでクライアント側でしか呼べない */
export const cssColor = (variable: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
