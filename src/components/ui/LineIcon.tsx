import { ICON, type IconId } from '../../constants/icons';

interface LineIconProps {
  readonly icon: IconId;
  readonly className?: string;
  readonly strokeWidth?: number;
}

export const LineIcon = ({ icon, className = 'h-5 w-5', strokeWidth = 1.8 }: LineIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={ICON[icon]} />
  </svg>
);
