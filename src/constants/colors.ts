import type { Genre } from '../types/geo';
import type { LayerId } from '../types/ui';

// 色の値は global.css の CSS 変数だけが持つ。ここは変数名かクラス名を指すだけにする。
// Tailwind はソース中の文字列からクラスを拾うので、クラス名は組み立てずに全文で書く。

interface GenreClass {
  /** ピンと線アイコンの色。currentColor で効かせる */
  readonly text: string;
  /** 一覧のアイコンの地色 */
  readonly tint: string;
  /** 凡例の点 */
  readonly dot: string;
}

export const GENRE_CLASS: Record<Genre, GenreClass> = {
  観る: { text: 'text-spot-see', tint: 'bg-spot-see-tint', dot: 'bg-spot-see' },
  食べる: { text: 'text-spot-eat', tint: 'bg-spot-eat-tint', dot: 'bg-spot-eat' },
  買う: { text: 'text-spot-buy', tint: 'bg-spot-buy-tint', dot: 'bg-spot-buy' },
  遊ぶ: { text: 'text-spot-play', tint: 'bg-spot-play-tint', dot: 'bg-spot-play' },
};

export const MARKER_CLASS = {
  park: 'text-brand-700',
  station: 'text-transit-station',
  busStop: 'text-transit-bus',
  toilet: 'text-toilet',
} as const;

export const LAYER_DOT_CLASS: Record<LayerId, string> = {
  観る: GENRE_CLASS.観る.dot,
  食べる: GENRE_CLASS.食べる.dot,
  買う: GENRE_CLASS.買う.dot,
  遊ぶ: GENRE_CLASS.遊ぶ.dot,
  access: 'bg-transit-station',
  toilet: 'bg-toilet',
};

export const LAYER_DOT_OFF_CLASS = 'bg-marker-off';

export const SERIES_COLOR_VAR = {
  park: '--color-series-park',
  zoo: '--color-series-zoo',
  michinoeki: '--color-series-michinoeki',
} as const;
