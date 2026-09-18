import type { IconId } from './icons';
import type { PanelId } from '../types/ui';

interface Panel {
  readonly id: PanelId;
  readonly label: string;
  readonly note: (spots: number) => string;
  readonly icon: IconId;
  /** 広い画面ではナビの下端に離して置き、狭い画面ではヘッダーのメニューに回す */
  readonly footer?: boolean;
}

export const PANELS: readonly Panel[] = [
  { id: 'highlights', label: '見どころ', note: () => 'ツツジ・紅葉', icon: 'photo' },
  { id: 'around', label: '寄り道', note: (spots) => `半径900m ${spots}件`, icon: 'pin' },
  { id: 'access', label: 'アクセス', note: () => '駅からの距離', icon: 'train' },
  { id: 'contact', label: 'ご意見', note: () => '県外の声を集める', icon: 'mail' },
  { id: 'sources', label: 'データ', note: () => '出典と注意点', icon: 'data', footer: true },
];

export const PANEL_IDS: readonly PanelId[] = PANELS.map((panel) => panel.id);
