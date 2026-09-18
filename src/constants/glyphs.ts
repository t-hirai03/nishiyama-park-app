import type { Genre } from '../types/geo';
import type { GlyphId } from '../types/ui';

/**
 * 種類のアイコン。24x24で描いて、地図のピンの頭と一覧の行の両方で使う。
 * 小さく出るので線は太めにし、形の数を絞っている。
 */
export const PIN_GLYPH: Record<GlyphId, string> = {
  see: '<path d="M1.5 12S5.5 6 12 6s10.5 6 10.5 6-4 6-10.5 6S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
  eat: '<path d="M8.5 3v18M5.5 3v5.5a3 3 0 0 0 6 0V3M16.5 21V13m0 0c-1.8 0-2.8-1.6-2.8-4.5S14.7 3 16.5 3s2.8 2.6 2.8 5.5-1 4.5-2.8 4.5Z"/>',
  buy: '<path d="M5.5 8h13l-1.2 12.5H6.7L5.5 8Zm3.6 0V5.8a2.9 2.9 0 0 1 5.8 0V8"/>',
  play: '<path d="M12 21v-4.5M6.5 16.5h11L12 7l-5.5 9.5Z"/>',
  park: '<path d="M12 21v-5M7 16h10l-5-6.5L7 16Zm1.5-6h7L12 4l-3.5 6Z"/>',
  station:
    '<path d="M7.5 3.5h9a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Zm-2 4.5h13M9.5 12h.5m4.5 0h.5M8.5 16 6.5 20.5m9-4.5 2 4.5"/>',
  bus: '<path d="M5.5 5.5h13v9.5h-13V5.5Zm0 4.5h13M8 15v3m8-3v3M9 8h6"/>',
  here: '<path d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/>',
  toilet:
    '<path d="M12 4.5v15"/><path d="M7.5 8.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 0c-1.3 0-2 .9-2 2v4h1.2v5h1.6v-5H9.5v-4c0-1.1-.7-2-2-2Z"/><path d="M16.5 8.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 0c-1.4 0-2.1 1-2.3 2.2l-.7 4.3h1.4v4.5h3.2V15h1.4l-.7-4.3c-.2-1.2-.9-2.2-2.3-2.2Z"/>',
};

export const GENRE_GLYPH: Record<Genre, GlyphId> = {
  観る: 'see',
  食べる: 'eat',
  買う: 'buy',
  遊ぶ: 'play',
};
