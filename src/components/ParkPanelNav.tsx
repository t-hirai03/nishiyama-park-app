export type PanelId = 'around' | 'access' | 'highlights' | 'sources';

const PANELS: readonly { id: PanelId; label: string; note: (spots: number) => string; icon: string }[] = [
  {
    id: 'highlights',
    label: '見どころ',
    note: () => 'ツツジ・紅葉',
    icon: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 9 3.5-4 2.5 3 2-2.5L18 15M9 10h.01',
  },
  {
    id: 'around',
    label: '寄り道',
    note: (spots) => `半径900m ${spots}件`,
    icon: 'M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
  {
    id: 'access',
    label: 'アクセス',
    note: () => '駅からの距離',
    icon: 'M8 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4h8M9.5 12h.01m4.99 0h.01M9 16l-2 4m8-4 2 4',
  },
  {
    id: 'sources',
    label: 'データ',
    note: () => '出典と注意点',
    icon: 'M12 4c3.9 0 7 .9 7 2s-3.1 2-7 2-7-.9-7-2 3.1-2 7-2Zm7 2v12c0 1.1-3.1 2-7 2s-7-.9-7-2V6m14 6c0 1.1-3.1 2-7 2s-7-.9-7-2',
  },
];

export const ParkPanelNav = ({
  current,
  spotCount,
  onSelect,
}: {
  current: PanelId | null;
  spotCount: number;
  onSelect: (id: PanelId) => void;
}) => (
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
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={on ? 2.2 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-6 w-6 shrink-0 lg:h-5 lg:w-5 lg:stroke-[1.6] ${
              on ? 'text-brand-600 lg:text-white' : 'text-stone-400'
            }`}
          >
            <path d={panel.icon} />
          </svg>
          <span className="min-w-0">
            <span
              className={`block text-[0.6875rem] font-bold whitespace-nowrap lg:text-sm ${
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
