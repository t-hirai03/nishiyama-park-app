import { LAYER_DOT_CLASS } from '../../constants/colors';
import { PRESENT_GENRES } from '../../lib/geo';
import type { LayerId } from '../../types/ui';

interface Layer {
  readonly id: LayerId;
  readonly label: string;
  readonly dotClass: string;
}

export const LAYERS: readonly Layer[] = [
  ...PRESENT_GENRES.map((genre) => ({ id: genre, label: genre, dotClass: LAYER_DOT_CLASS[genre] })),
  { id: 'access', label: '駅・バス停', dotClass: LAYER_DOT_CLASS.access },
  { id: 'toilet', label: 'トイレ', dotClass: LAYER_DOT_CLASS.toilet },
];

export const ALL_LAYER_IDS: ReadonlySet<LayerId> = new Set(LAYERS.map((layer) => layer.id));
