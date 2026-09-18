import { PANELS } from '../constants/panels';
import type { PanelId } from '../types/ui';
import { LineIcon } from './ui/LineIcon';

interface ParkPanelNavProps {
  readonly current: PanelId | null;
  readonly spotCount: number;
  readonly onSelect: (id: PanelId) => void;
}

export const ParkPanelNav = ({ current, spotCount, onSelect }: ParkPanelNavProps) => (
  <nav
    aria-label="表示する情報"
    className="fixed inset-x-0 bottom-0 z-1000 flex border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:z-auto lg:w-52 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-t-0 lg:border-r lg:bg-white lg:p-3 lg:pb-3 lg:backdrop-blur-none"
  >
    {PANELS.map((panel) => {
      const on = current === panel.id;
      return (
        <button
          key={panel.id}
          type="button"
          onClick={() => onSelect(panel.id)}
          aria-current={on}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition duration-150 lg:w-full lg:flex-none lg:flex-row lg:items-center lg:gap-2.5 lg:rounded-xl lg:px-3 lg:py-2 lg:text-left ${
            on ? 'lg:bg-brand-600' : 'lg:hover:bg-brand-50'
          } ${panel.footer ? 'hidden lg:mt-auto lg:flex lg:border-t lg:border-stone-200 lg:pt-3' : ''}`}
        >
          <LineIcon
            icon={panel.icon}
            strokeWidth={on ? 2.2 : 1.6}
            className={`h-6 w-6 shrink-0 lg:h-5 lg:w-5 lg:stroke-[1.6] ${
              on ? 'text-brand-600 lg:text-white' : 'text-stone-400'
            }`}
          />
          <span className="min-w-0">
            <span
              className={`block text-2xs font-bold whitespace-nowrap lg:text-sm ${
                on ? 'text-brand-700 lg:text-white' : 'text-stone-500 lg:text-stone-900'
              }`}
            >
              {panel.label}
            </span>
            <span
              className={`hidden truncate text-xs lg:block ${on ? 'text-brand-100' : 'text-stone-400'}`}
            >
              {panel.note(spotCount)}
            </span>
          </span>
        </button>
      );
    })}
  </nav>
);
