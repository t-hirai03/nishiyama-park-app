/** 選択肢。id が値、label が画面に出す文言 */
export interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}
