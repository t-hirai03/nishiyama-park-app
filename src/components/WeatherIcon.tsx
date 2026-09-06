import type { ReactElement } from 'react';
import type { WeatherCategory } from '../lib/days';

const PATHS: Record<WeatherCategory, ReactElement> = {
  sunny: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
    </>
  ),
  cloudy: (
    <>
      <path d="M8.5 7.5a4.2 4.2 0 0 1 8 1.1 3.4 3.4 0 0 1-.6 6.7H8.2a4 4 0 0 1-.4-8 4.2 4.2 0 0 1 .7.2Z" />
    </>
  ),
  rain: (
    <>
      <path d="M8.5 5.5a4.2 4.2 0 0 1 8 1.1 3.4 3.4 0 0 1-.6 6.7H8.2a4 4 0 0 1-.4-8 4.2 4.2 0 0 1 .7.2Z" />
      <path d="M9 17.2l-1 2.6M13 17.2l-1 2.6M17 17.2l-1 2.6" />
    </>
  ),
  snow: (
    <>
      <path d="M8.5 5.5a4.2 4.2 0 0 1 8 1.1 3.4 3.4 0 0 1-.6 6.7H8.2a4 4 0 0 1-.4-8 4.2 4.2 0 0 1 .7.2Z" />
      <path d="M9.4 18.4h.01M13 17.6h.01M16.6 18.4h.01M11.2 20.6h.01M14.8 20.6h.01" />
    </>
  ),
};

export const WeatherIcon = ({
  category,
  className = '',
}: {
  category: WeatherCategory;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {PATHS[category]}
  </svg>
);
