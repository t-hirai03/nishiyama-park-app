import { useState, type KeyboardEvent } from 'react';
import type { IconId } from '../../constants/icons';
import { useCopyLink } from '../../hooks/useCopyLink';
import type { Highlight, HighlightPhoto } from '../../types/ui';
import { photoShareUrl } from '../../utils/share';
import { PhotoViewer } from '../PhotoViewer';
import { LineIcon } from '../ui/LineIcon';
import { NextStep } from './NextStep';
import { PanelHead } from './PanelHead';

interface CardActionProps {
  readonly label: string;
  readonly icon: IconId;
  readonly onClick: () => void;
}

const CardAction = ({ label, icon, onClick }: CardActionProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-stone-600 transition duration-150 hover:bg-brand-50 hover:text-brand-700"
  >
    <LineIcon icon={icon} className="h-4 w-4" />
    {label}
  </button>
);

interface PhotoCardProps {
  readonly photo: HighlightPhoto;
  readonly alt: string;
  readonly copied: boolean;
  readonly onZoom: () => void;
  readonly onCopy: () => void;
}

const PhotoCard = ({ photo, alt, copied, onZoom, onCopy }: PhotoCardProps) => (
  <li className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
    <button
      type="button"
      onClick={onZoom}
      aria-label={`${alt}枚目を大きく見る`}
      className="group block w-full cursor-zoom-in overflow-hidden"
    >
      <img
        src={photo.card}
        width={800}
        height={800}
        alt={alt}
        loading="lazy"
        className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    </button>

    {photo.caption && (
      <p className="px-4 pt-3.5 text-sm leading-relaxed text-stone-700">{photo.caption}</p>
    )}

    <div className="mt-auto flex items-center gap-1 px-2 pt-1.5 pb-2.5">
      <CardAction label="拡大" icon="zoomIn" onClick={onZoom} />
      <CardAction
        label={copied ? 'コピーしました' : 'この写真のリンク'}
        icon={copied ? 'check' : 'link'}
        onClick={onCopy}
      />
    </div>
  </li>
);

interface HighlightsPanelProps {
  readonly highlights: readonly Highlight[];
  readonly highlight: Highlight;
  readonly initialPhoto: number | null;
  readonly onSelect: (id: string) => void;
  readonly onMap: () => void;
  readonly onClose: () => void;
}

export const HighlightsPanel = ({
  highlights,
  highlight,
  initialPhoto,
  onSelect,
  onMap,
  onClose,
}: HighlightsPanelProps) => {
  const [viewerIndex, setViewerIndex] = useState<number | null>(
    initialPhoto !== null && initialPhoto < highlight.photos.length ? initialPhoto : null
  );
  const { copiedKey, copy } = useCopyLink();

  const select = (id: string) => {
    onSelect(id);
    setViewerIndex(null);
  };

  const onTabKey = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const at = highlights.findIndex((item) => item.id === highlight.id);
    const next = highlights[(at + step + highlights.length) % highlights.length];
    if (!next) return;
    select(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <>
      <PanelHead
        title="見どころ"
        lead="見頃の時期は日別来訪者数から機械的に導いたものです。"
        onClose={onClose}
      />

      <div
        role="tablist"
        aria-label="見どころの時期"
        className="mt-5 flex gap-1 overflow-x-auto"
        onKeyDown={onTabKey}
      >
        {highlights.map((item) => {
          const on = item.id === highlight.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${item.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(item.id)}
              className={`flex shrink-0 items-baseline gap-2 rounded-t-xl px-5 py-2.5 transition duration-150 ${
                on
                  ? 'bg-white text-stone-900'
                  : 'bg-brand-100 text-brand-800/70 hover:bg-brand-200 hover:text-brand-900'
              }`}
            >
              <span className="text-sm font-bold">{item.title}</span>
              {item.window && (
                <span className="text-xs font-normal text-stone-500 tabular-nums">{item.window}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${highlight.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${highlight.id}`}
        tabIndex={0}
        className="rounded-b-2xl bg-white p-4 shadow-sm sm:p-6"
      >
        <p className="text-xs leading-relaxed text-stone-500">{highlight.lead}</p>
        <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {highlight.photos.map((photo, index) => (
            <PhotoCard
              key={photo.card}
              photo={photo}
              alt={`${highlight.title} ${index + 1}`}
              copied={copiedKey === photo.card}
              onZoom={() => setViewerIndex(index)}
              onCopy={() => copy(photo.card, photoShareUrl(highlight.id, index))}
            />
          ))}
        </ul>
      </div>

      <NextStep label="公園の近くに何があるか見る" onClick={onMap} />

      {viewerIndex !== null && (
        <PhotoViewer
          photos={highlight.photos}
          index={viewerIndex}
          caption={highlight.title}
          onMove={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
};
