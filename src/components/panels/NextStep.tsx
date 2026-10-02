import { LineIcon } from '../ui/LineIcon';

interface NextStepProps {
  readonly label: string;
  readonly onClick: () => void;
}

export const NextStep = ({ label, onClick }: NextStepProps) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-600 px-5 py-3.5 text-left text-white transition duration-150 hover:bg-brand-700"
  >
    <span className="text-sm font-bold whitespace-nowrap">{label}</span>
    <LineIcon icon="arrowRight" strokeWidth={2} className="h-4 w-4 shrink-0" />
  </button>
);
