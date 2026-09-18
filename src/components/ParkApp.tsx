import { useState } from 'react';
import { usePanelRequest } from '../hooks/usePanelRequest';
import { GENRE_ORDER, NEARBY_SPOTS, PARK } from '../lib/geo';
import type { Anchor, Genre, Placed, TravelMode } from '../types/geo';
import type { Highlight, LayerId, PanelId, SortKey } from '../types/ui';
import { toggled } from '../utils/set';
import { ALL_LAYER_IDS } from './map/layers';
import { ParkMap } from './map/ParkMap';
import { ParkPanelNav } from './ParkPanelNav';
import { AccessPanel } from './panels/AccessPanel';
import { AroundPanel } from './panels/AroundPanel';
import { FeedbackPanel } from './panels/FeedbackPanel';
import { HighlightsPanel } from './panels/HighlightsPanel';
import { NextStep } from './panels/NextStep';
import { SourcesPanel } from './panels/SourcesPanel';

/** 行き先は公園そのもの。園内のどこへ行くかまでは案内しない */
const DESTINATION: Anchor = PARK;

/** 写真とフォームは幅が要るので、このパネルは地図を隠して右側を全部使う */
const FULL_WIDTH_PANELS: ReadonlySet<PanelId> = new Set(['highlights', 'contact']);

interface ParkAppProps {
  readonly highlights: readonly Highlight[];
}

export const ParkApp = ({ highlights }: ParkAppProps) => {
  const [panel, setPanel] = useState<PanelId | null>('highlights');
  const [active, setActive] = useState<ReadonlySet<LayerId>>(ALL_LAYER_IDS);
  const [genres, setGenres] = useState<ReadonlySet<Genre>>(() => new Set(GENRE_ORDER));
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [focus, setFocus] = useState<Placed | null>(null);
  const [from, setFrom] = useState<Placed | null>(null);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [highlightId, setHighlightId] = useState(highlights[0]?.id ?? '');

  usePanelRequest(setPanel);

  const close = () => setPanel(null);
  const toggleLayer = (id: LayerId) => setActive((current) => toggled(current, id));

  // パネルのチップと地図の表示切り替えは同じものを指すので、両方を動かす
  const toggleGenre = (genre: Genre) => {
    setGenres((current) => toggled(current, genre));
    toggleLayer(genre);
  };

  const highlight = highlights.find((item) => item.id === highlightId) ?? highlights[0];
  const fullWidth = panel !== null && FULL_WIDTH_PANELS.has(panel);

  return (
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      <ParkPanelNav
        current={panel}
        spotCount={NEARBY_SPOTS.length}
        onSelect={(id) => setPanel((value) => (value === id ? null : id))}
      />

      <div className="relative flex flex-1 flex-col lg:block lg:min-h-0">
        <main
          className={`shrink-0 lg:absolute lg:inset-0 lg:h-auto ${
            fullWidth ? 'hidden' : panel ? 'h-[55dvh]' : 'h-[calc(100dvh-9rem)]'
          }`}
        >
          <ParkMap
            active={active}
            onToggleLayer={toggleLayer}
            focus={focus}
            link={from ? { from, to: DESTINATION } : null}
            panelOpen={panel !== null}
          />
        </main>

        {panel && (
          <div
            className={
              fullWidth
                ? 'flex-1 bg-brand-50 lg:absolute lg:inset-0 lg:overflow-y-auto'
                : 'lg:pointer-events-none lg:absolute lg:inset-y-0 lg:left-0 lg:z-900 lg:w-[27rem] lg:max-w-[calc(100%-1.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-4'
            }
          >
            <div
              className={
                fullWidth
                  ? 'mx-auto w-[min(72rem,100%)] px-4 pt-6 pb-40 sm:px-6 sm:pt-8 lg:pb-24'
                  : 'bg-stone-50 px-4 pt-5 pb-28 sm:px-5 lg:pointer-events-auto lg:rounded-3xl lg:bg-white/95 lg:pb-5 lg:shadow-lg lg:ring-1 lg:ring-stone-200 lg:backdrop-blur'
              }
            >
              {panel === 'highlights' && highlight && (
                <HighlightsPanel
                  highlights={highlights}
                  highlight={highlight}
                  onSelect={setHighlightId}
                  onMap={() => setPanel('around')}
                  onClose={close}
                />
              )}
              {panel === 'around' && (
                <AroundPanel
                  genres={genres}
                  onToggleGenre={toggleGenre}
                  sortKey={sortKey}
                  onSort={setSortKey}
                  onFocus={setFocus}
                  onNext={() => setPanel('access')}
                  onClose={close}
                />
              )}
              {panel === 'access' && (
                <AccessPanel
                  destination={DESTINATION}
                  from={from}
                  onFrom={setFrom}
                  mode={mode}
                  onMode={setMode}
                  onClose={close}
                />
              )}
              {panel === 'contact' && <FeedbackPanel />}
              {panel === 'sources' && <SourcesPanel onClose={close} />}
            </div>
          </div>
        )}
      </div>

      {panel === 'highlights' && (
        <NextStep label="公園の近くに何があるか見る" onClick={() => setPanel('around')} floating />
      )}
    </div>
  );
};
