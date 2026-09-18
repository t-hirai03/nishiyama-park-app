import { LineIcon } from '../ui/LineIcon';

interface NextStepProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly floating?: boolean;
}

export const NextStep = ({ label, onClick, floating = false }: NextStepProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      floating
        ? 'fixed bottom-20 left-1/2 z-900 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-600 px-6 py-3.5 text-white shadow-lg ring-1 ring-brand-700/20 transition duration-150 hover:bg-brand-700 lg:bottom-5'
        : 'mt-6 flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-600 px-5 py-3.5 text-left text-white transition duration-150 hover:bg-brand-700'
    }
  >
    <span className="text-sm font-bold whitespace-nowrap">{label}</span>
    <LineIcon icon="arrowRight" strokeWidth={2} className="h-4 w-4 shrink-0" />
  </button>
);
