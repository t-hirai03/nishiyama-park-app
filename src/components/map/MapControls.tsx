import { useState } from 'react';
import { LAYER_DOT_OFF_CLASS } from '../../constants/colors';
import type { IconId } from '../../constants/icons';
import type { BaseMapId, LayerId, MapControlId } from '../../types/ui';
import { LineIcon } from '../ui/LineIcon';
import { ToggleChip } from '../ui/ToggleChip';
import { BASE_MAPS } from './leaflet';
import { LAYERS } from './layers';

const CONTROLS: readonly { readonly id: MapControlId; readonly label: string; readonly icon: IconId }[] = [
  { id: 'base', label: '地図の種類', icon: 'layers' },
  { id: 'layers', label: '表示する場所', icon: 'pin' },
];

const POPOVER_CLASS = 'rounded-2xl bg-white/95 p-2.5 shadow-sm ring-1 ring-stone-200 backdrop-blur';

interface MapControlsProps {
  readonly baseMap: BaseMapId;
  readonly onBaseMap: (id: BaseMapId) => void;
  readonly active: ReadonlySet<LayerId>;
  readonly onToggleLayer: (id: LayerId) => void;
}

export const MapControls = ({ baseMap, onBaseMap, active, onToggleLayer }: MapControlsProps) => {
  const [open, setOpen] = useState<MapControlId | null>(null);

  return (
    <div className="absolute top-3 right-3 z-900 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2">
      <div className="flex gap-2">
        {CONTROLS.map((control) => (
          <button
            key={control.id}
            type="button"
            onClick={() => setOpen((current) => (current === control.id ? null : control.id))}
            aria-expanded={open === control.id}
            aria-label={control.label}
            title={control.label}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition duration-150 ${
              open === control.id
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white/95 text-stone-600 ring-stone-200 backdrop-blur hover:text-stone-900'
            }`}
          >
            <LineIcon icon={control.icon} strokeWidth={1.6} />
            {control.id === 'layers' && active.size < LAYERS.length && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
            )}
          </button>
        ))}
      </div>

      {open === 'base' && (
        <div className={POPOVER_CLASS}>
          <div className="flex justify-end gap-1.5">
            {BASE_MAPS.map((preset) => (
              <ToggleChip
                key={preset.id}
                compact
                on={baseMap === preset.id}
                label={preset.label}
                onClick={() => onBaseMap(preset.id)}
              />
            ))}
          </div>
        </div>
      )}

      {open === 'layers' && (
        <div className={POPOVER_CLASS}>
          <div className="flex flex-wrap justify-end gap-1.5">
            {LAYERS.map((layer) => (
              <ToggleChip
                key={layer.id}
                compact
                on={active.has(layer.id)}
                dotClass={layer.dotClass}
                offDotClass={LAYER_DOT_OFF_CLASS}
                label={layer.label}
                onClick={() => onToggleLayer(layer.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
