import { useEffect, useRef } from 'react';
import type { HighlightPhoto } from './ParkApp';

interface Props {
  readonly photos: readonly HighlightPhoto[];
  readonly index: number;
  readonly caption: string;
  readonly onMove: (index: number) => void;
  readonly onClose: () => void;
}

const ARROW = {
  prev: 'm15 6-6 6 6 6',
  next: 'm9 6 6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
} as const;

const IconButton = ({
  path,
  label,
  onClick,
  className = '',
}: {
  path: string;
  label: string;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition duration-150 hover:bg-white ${className}`}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d={path} />
    </svg>
  </button>
);

export const PhotoViewer = ({ photos, index, caption, onMove, onClose }: Props) => {
  const closeButton = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onMove((index - 1 + photos.length) % photos.length);
      if (event.key === 'ArrowRight') onMove((index + 1) % photos.length);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [index, photos.length, onMove, onClose]);

  // 開いた直後に閉じるボタンへ寄せておかないと、キーボードだけでは閉じられない
  useEffect(() => {
    closeButton.current?.querySelector('button')?.focus();
  }, []);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${caption} ${index + 1}枚目`}
      className="fixed inset-0 z-1000 flex flex-col bg-stone-950/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div ref={closeButton} className="flex shrink-0 items-center justify-between gap-4">
        <p className="text-sm text-white">
          {caption}
          <span className="ml-2 text-xs text-stone-300 tabular-nums">
            {index + 1} / {photos.length}
          </span>
        </p>
        <IconButton path={ARROW.close} label="閉じる" onClick={onClose} />
      </div>

      {/* 狭い画面では左右ボタンを横に並べると画像が潰れるので、画像の上に重ねる */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        <img
          src={photo.full}
          width={photo.fullWidth}
          height={photo.fullHeight}
          alt={`${caption} ${index + 1}枚目`}
          onClick={(event) => event.stopPropagation()}
          className="max-h-full min-h-0 w-auto max-w-full rounded-xl object-contain"
        />
        {photos.length > 1 && (
          <>
            <IconButton
              path={ARROW.prev}
              label="前の写真"
              onClick={() => onMove((index - 1 + photos.length) % photos.length)}
              className="absolute top-1/2 left-1 -translate-y-1/2 sm:left-3"
            />
            <IconButton
              path={ARROW.next}
              label="次の写真"
              onClick={() => onMove((index + 1) % photos.length)}
              className="absolute top-1/2 right-1 -translate-y-1/2 sm:right-3"
            />
          </>
        )}
      </div>

      <p className="shrink-0 text-center text-xs text-stone-300">
        背景を押すか Esc で閉じます。左右キーでも切り替えられます。
      </p>
    </div>
  );
};
