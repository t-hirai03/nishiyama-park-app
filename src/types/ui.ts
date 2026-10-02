import type { Genre } from './geo';

export type PanelId = 'highlights' | 'around' | 'access' | 'contact' | 'sources';

export type LayerId = Genre | 'access' | 'toilet';

export type BaseMapId = 'photo' | 'pale' | 'std';

export type MapControlId = 'base' | 'layers';

export type SortKey = 'name' | 'distance';

export type GlyphId =
  | 'see'
  | 'eat'
  | 'buy'
  | 'play'
  | 'park'
  | 'station'
  | 'bus'
  | 'here'
  | 'toilet';

export interface HighlightPhoto {
  readonly card: string;
  readonly caption: string;
  readonly full: string;
  readonly fullWidth: number;
  readonly fullHeight: number;
}

export interface Highlight {
  readonly id: string;
  readonly title: string;
  readonly lead: string;
  readonly window: string | null;
  /** 1115 のような月日の整数 */
  readonly windowKeys: { readonly from: number; readonly to: number } | null;
  readonly photos: readonly HighlightPhoto[];
}

export type VisitExperience = 'visited' | 'not-yet';

export type Gender = 'female' | 'male' | 'other' | 'no-answer';

/** ご意見フォームの1回答。個人を特定する項目は持たない */
export interface FeedbackAnswer {
  readonly prefecture: string;
  readonly visit: VisitExperience;
  readonly gender: Gender | null;
  /** 生年月日そのものは持たず、20代のような10歳刻みの下限だけ残す */
  readonly ageGroup: number | null;
  readonly hasComment: boolean;
}
