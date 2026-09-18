import { useState, type KeyboardEvent } from 'react';
import type { IconId } from '../../constants/icons';
import { useCopyLink } from '../../hooks/useCopyLink';
import type { Highlight, HighlightPhoto } from '../../types/ui';
import { PhotoViewer } from '../PhotoViewer';
import { LineIcon } from '../ui/LineIcon';
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
    aria-label={label}
    title={label}
    className="rounded-full p-2 text-stone-600 transition duration-150 hover:bg-brand-50 hover:text-brand-700"
  >
    <LineIcon icon={icon} />
  </button>
);

interface PhotoCardProps {
  readonly photo: HighlightPhoto;
  readonly alt: string;
  readonly copied: boolean;
  readonly onZoom: () => void;
  readonly onMap: () => void;
  readonly onCopy: () => void;
}

const PhotoCard = ({ photo, alt, copied, onZoom, onMap, onCopy }: PhotoCardProps) => (
  <li className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600">
        <LineIcon icon="tree" className="h-4 w-4 text-white" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-stone-900">西山公園</span>
        <span className="block truncate text-xs text-stone-500">福井県鯖江市</span>
      </span>
    </div>

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

    <div className="flex items-center gap-1 px-2.5 pt-2.5">
      <CardAction label="大きく見る" icon="zoomIn" onClick={onZoom} />
      <CardAction label="地図で見る" icon="pin" onClick={onMap} />
      <CardAction
        label={copied ? 'コピーしました' : 'リンクをコピー'}
        icon={copied ? 'check' : 'link'}
        onClick={onCopy}
      />
    </div>

    {photo.caption && (
      <p className="px-3.5 pt-2 pb-4 text-sm leading-relaxed text-stone-700">{photo.caption}</p>
    )}
  </li>
);

interface HighlightsPanelProps {
  readonly highlights: readonly Highlight[];
  readonly highlight: Highlight;
  readonly onSelect: (id: string) => void;
  readonly onMap: () => void;
  readonly onClose: () => void;
}

export const HighlightsPanel = ({
  highlights,
  highlight,
  onSelect,
  onMap,
  onClose,
}: HighlightsPanelProps) => {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { copied, copy } = useCopyLink();

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
                <span className="text-xs font-normal text-stone-400 tabular-nums">{item.window}</span>
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
              copied={copied}
              onZoom={() => setViewerIndex(index)}
              onMap={onMap}
              onCopy={copy}
            />
          ))}
        </ul>
      </div>

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
