import type { ReactNode } from 'react';

interface ExternalLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
  readonly title?: string;
  readonly onClick?: () => void;
}

export const TEXT_LINK_CLASS =
  'underline decoration-stone-300 underline-offset-4 hover:text-stone-900';

export const ExternalLink = ({
  href,
  children,
  className = TEXT_LINK_CLASS,
  label,
  title,
  onClick,
}: ExternalLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
    aria-label={label}
    title={title}
    onClick={onClick}
  >
    {children}
  </a>
);
