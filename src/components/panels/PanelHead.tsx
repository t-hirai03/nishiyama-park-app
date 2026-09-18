import { LineIcon } from '../ui/LineIcon';

interface PanelHeadProps {
  readonly title: string;
  readonly lead: string;
  readonly onClose: () => void;
}

export const PanelHead = ({ title, lead, onClose }: PanelHeadProps) => (
  <>
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-stone-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じて地図を見る"
        title="閉じて地図を見る"
        className="-mt-1.5 -mr-1.5 shrink-0 rounded-full p-2 text-stone-400 transition duration-150 hover:bg-brand-50 hover:text-stone-900"
      >
        <LineIcon icon="close" className="h-4 w-4" />
      </button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">{lead}</p>
  </>
);
