interface ToggleChipProps {
  readonly on: boolean;
  readonly label: string;
  readonly onClick: () => void;
  /** 凡例の点の色。無ければ点を出さない */
  readonly dotClass?: string;
  readonly offDotClass?: string;
  /** 地図の上に重ねるときは小さくする */
  readonly compact?: boolean;
}

export const ToggleChip = ({
  on,
  label,
  onClick,
  dotClass,
  offDotClass,
  compact = false,
}: ToggleChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`flex items-center gap-1.5 rounded-full text-xs whitespace-nowrap transition duration-150 ${
      compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
    } ${on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-stone-500 hover:bg-brand-100'}`}
  >
    {dotClass && (
      <span
        className={`inline-block h-2 w-2 rounded-full ${on ? dotClass : (offDotClass ?? dotClass)}`}
      />
    )}
    {label}
  </button>
);
