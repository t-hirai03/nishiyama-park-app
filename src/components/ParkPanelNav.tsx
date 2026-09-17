export type PanelId = 'around' | 'access' | 'highlights' | 'sources';

const PANELS: readonly { id: PanelId; label: string; note: (spots: number) => string; icon: string }[] = [
  {
    id: 'around',
    label: '寄り道',
    note: (spots) => `半径900m ${spots}件`,
    icon: 'M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
  {
    id: 'access',
    label: 'アクセス',
    note: () => '駅・バス停',
    icon: 'M8 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4h8M9.5 12h.01m4.99 0h.01M9 16l-2 4m8-4 2 4',
  },
  {
    id: 'highlights',
    label: '見どころ',
    note: () => 'ツツジ・紅葉',
    icon: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 9 3.5-4 2.5 3 2-2.5L18 15M9 10h.01',
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
    className="flex shrink-0 gap-1 overflow-x-auto border-b border-stone-200 bg-white p-2 lg:w-52 lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:border-r lg:border-b-0 lg:p-3"
  >
    {PANELS.map((panel) => {
      const on = current === panel.id;
      return (
        <button
          key={panel.id}
          type="button"
          onClick={() => onSelect(panel.id)}
          aria-current={on}
          className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition duration-150 lg:w-full ${
            on ? 'bg-brand-600' : 'hover:bg-brand-50'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 ${on ? 'text-white' : 'text-stone-400'}`}
          >
            <path d={panel.icon} />
          </svg>
          <span className="min-w-0">
            <span
              className={`block text-sm font-bold whitespace-nowrap ${on ? 'text-white' : 'text-stone-900'}`}
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
