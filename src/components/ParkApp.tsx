import { useMemo, useState } from 'react';
import { LAYERS, ParkMap, type LayerId } from './ParkMap';
import { ParkPanelNav, type PanelId } from './ParkPanelNav';
import { PhotoViewer } from './PhotoViewer';
import { GENRE_GLYPH, SpotIcon } from './SpotIcon';
import {
  BUS_STOPS,
  GENRE_COLOR_VAR,
  GENRE_ORDER,
  GEO_SOURCE,
  NEARBY_SPOTS,
  PARK,
  PARK_ROUTES,
  STATIONS,
  TOILETS,
  TRAVEL_MODES,
  directionsUrlBetween,
  primaryGenre,
  spotKey,
  type Anchor,
  type Genre,
  type Placed,
  type TravelMode,
} from '../lib/geo';

export interface HighlightPhoto {
  readonly card: string;
  readonly caption: string;
  readonly full: string;
  readonly fullWidth: number;
  readonly fullHeight: number;
}

export interface Highlight {
  readonly id: string;
  readonly title: string;
  readonly lead: string;
  readonly window: string | null;
  readonly photos: readonly HighlightPhoto[];
}

/** 徒歩圏の駅。実測では西鯖江駅6分・鯖江駅12分の2件になる */
const ORIGIN_STATIONS = STATIONS.filter((station) => station.walkMinutes <= 15);
const PARK_TOILETS = TOILETS.filter((toilet) => toilet.inPark);
const BARRIER_FREE = PARK_TOILETS.filter((toilet) => toilet.barrierFree).length;
const LINKED_SPOTS = NEARBY_SPOTS.filter((spot) => spot.homepage).length;
const ORIGINS: readonly Placed[] = ORIGIN_STATIONS;

/** 行き先は公園そのもの。園内のどこへ行くかまでは案内しない */
const DESTINATION: Anchor = { name: PARK.name, lat: PARK.lat, lon: PARK.lon };

type SortKey = 'name' | 'distance';

const SORTS: readonly { id: SortKey; label: string }[] = [
  { id: 'name', label: '名前順' },
  { id: 'distance', label: '近い順' },
];

/**
 * 観光データに名称の読み（かな）が無いため、漢字の名前は読み順にならない。
 * かな始まりの20件は期待どおり並び、漢字始まりの29件はUnicodeの順になる。
 */
const JA_COLLATOR = new Intl.Collator('ja');

const GENRE_TINT: Record<Genre, string> = {
  観る: '--color-spot-see-tint',
  食べる: '--color-spot-eat-tint',
  買う: '--color-spot-buy-tint',
  遊ぶ: '--color-spot-play-tint',
};

const Chip = ({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition duration-150 ${
      on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-stone-500 hover:bg-brand-100'
    }`}
  >
    {label}
  </button>
);

const CardAction = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="rounded-full p-2 text-stone-600 transition duration-150 hover:bg-brand-50 hover:text-brand-700"
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
      <path d={icon} />
    </svg>
  </button>
);

const NextStep = ({
  label,
  onClick,
  floating = false,
}: {
  label: string;
  onClick: () => void;
  floating?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      floating
        ? 'fixed bottom-20 left-1/2 z-900 flex -translate-x-1/2 lg:bottom-5 items-center gap-3 rounded-full bg-brand-600 px-6 py-3.5 text-white shadow-lg ring-1 ring-brand-700/20 transition duration-150 hover:bg-brand-700'
        : 'mt-6 flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-600 px-5 py-3.5 text-left text-white transition duration-150 hover:bg-brand-700'
    }
  >
    <span className="text-sm font-bold whitespace-nowrap">{label}</span>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M5 12h14m-6-7 7 7-7 7" />
    </svg>
  </button>
);

const PanelHead = ({
  title,
  lead,
  onClose,
}: {
  title: string;
  lead: string;
  onClose: () => void;
}) => (
  <>
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-stone-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じて地図を見る"
        title="閉じて地図を見る"
        className="-mt-1.5 -mr-1.5 shrink-0 rounded-full p-2 text-stone-400 transition duration-150 hover:bg-brand-50 hover:text-stone-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">{lead}</p>
  </>
);

export const ParkApp = ({ highlights }: { highlights: readonly Highlight[] }) => {
  const [panel, setPanel] = useState<PanelId | null>('highlights');
  const [active, setActive] = useState<ReadonlySet<LayerId>>(
    () => new Set(LAYERS.map((layer) => layer.id))
  );
  const [genres, setGenres] = useState<ReadonlySet<Genre>>(() => new Set(GENRE_ORDER));
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [focus, setFocus] = useState<Placed | null>(null);
  const [from, setFrom] = useState<Placed | null>(null);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [highlightId, setHighlightId] = useState(highlights[0]?.id ?? '');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_600);
      })
      .catch(() => setCopied(false));
  };

  const toggleLayer = (id: LayerId) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // パネルのチップと地図の表示切り替えは同じものを指すので、両方を動かす
  const toggleGenre = (genre: Genre) => {
    setGenres((current) => {
      const next = new Set(current);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
    toggleLayer(genre);
  };

  const visibleSpots = useMemo(() => {
    const matched = NEARBY_SPOTS.filter((spot) => {
      const genre = primaryGenre(spot);
      return genre ? genres.has(genre) : false;
    });
    return sortKey === 'distance'
      ? [...matched].sort((a, b) => a.distanceM - b.distanceM)
      : [...matched].sort((a, b) => JA_COLLATOR.compare(a.name, b.name));
  }, [genres, sortKey]);


  const highlight = highlights.find((item) => item.id === highlightId) ?? highlights[0];
  /** 写真は大きく見せたいので、このパネルだけ地図を隠して右側を全部使う */
  const fullWidth = panel === 'highlights';

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
              {panel === 'around' && (
                <>
                  <PanelHead
                    title="公園を出てから、どこへ寄れるか"
                    lead={`鯖江市の観光データから半径900m以内のスポット${NEARBY_SPOTS.length}件。名前を押すと地図が寄り、ピンのポップアップから経路や店舗情報に飛べます。名前順は、データに読みが無いため漢字の名前は読み順になりません。`}
                    onClose={() => setPanel(null)}
                  />

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {GENRE_ORDER.filter((genre) =>
                      NEARBY_SPOTS.some((spot) => primaryGenre(spot) === genre)
                    ).map((genre) => (
                      <Chip
                        key={genre}
                        on={genres.has(genre)}
                        label={genre}
                        onClick={() => toggleGenre(genre)}
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-stone-500">
                      {visibleSpots.length === NEARBY_SPOTS.length
                        ? `${NEARBY_SPOTS.length}件`
                        : `${NEARBY_SPOTS.length}件のうち${visibleSpots.length}件`}
                    </p>
                    <div className="flex gap-1">
                      {SORTS.map((sort) => (
                        <Chip
                          key={sort.id}
                          on={sortKey === sort.id}
                          label={sort.label}
                          onClick={() => setSortKey(sort.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <ul className="mt-1">
                    {visibleSpots.map((spot) => {
                      const genre = primaryGenre(spot);
                      return (
                        <li
                          key={spotKey(spot)}
                          className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-2 transition duration-150 hover:bg-brand-50"
                        >
                          <button
                            type="button"
                            onClick={() => setFocus(spot)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            {genre && (
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                style={{ background: `var(${GENRE_TINT[genre]})` }}
                              >
                                <SpotIcon
                                  glyph={GENRE_GLYPH[genre]}
                                  colorVar={GENRE_COLOR_VAR[genre]}
                                  className="h-4 w-4"
                                />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-stone-900">
                                {spot.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-stone-400">
                                {spot.category}・徒歩{spot.walkMinutes}分（{spot.distanceM}m）
                              </span>
                            </span>
                          </button>
                          {spot.homepage && (
                            <a
                              href={spot.homepage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-full p-1.5 text-stone-400 transition duration-150 hover:bg-white hover:text-brand-700"
                              aria-label={`${spot.name}のサイトを開く`}
                              title="サイトを開く"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                className="h-4 w-4"
                              >
                                <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
                              </svg>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {visibleSpots.length === 0 && (
                    <p className="mt-4 text-xs text-stone-500">
                      ジャンルがすべて外れています。上のチップから選び直してください。
                    </p>
                  )}
                  <p className="mt-4 text-xs leading-relaxed text-stone-400">
                    右上のアイコンはデータセットに収録されたURLへのリンクです（{LINKED_SPOTS}/
                    {NEARBY_SPOTS.length}件）。収録時点のURLなので、現在は繋がらない場合があります。
                    営業時間や口コミは、ピンを押して出るGoogleマップのリンクから確認できます。
                  </p>
                  <NextStep label="行き方を調べる" onClick={() => setPanel('access')} />
                </>
              )}

              {panel === 'access' && (
                <>
                  <PanelHead
                    title="西山公園へのアクセス情報"
                    lead="駅を選ぶと、西山公園までの直線距離と徒歩時間を出します。"
                    onClose={() => setPanel(null)}
                  />

                  <p className="mt-4 text-xs font-bold text-stone-900">どの駅から</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ORIGINS.map((place) => (
                      <Chip
                        key={spotKey(place)}
                        on={from !== null && spotKey(from) === spotKey(place)}
                        label={place.name}
                        onClick={() => setFrom(place)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-brand-50 p-4">
                    {from ? (
                      <>
                        <p className="text-xs text-stone-500">
                          {from.name} → {DESTINATION.name}
                        </p>
                        <p className="mt-1.5 text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
                          {from.distanceM.toLocaleString()}
                          <span className="ml-1 text-base font-medium text-stone-500">m</span>
                          <span className="ml-3 text-base font-medium text-stone-500">
                            徒歩{from.walkMinutes}分
                          </span>
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                          直線距離を80m=1分・切り上げで換算した目安です。実際の経路とは異なります。
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {TRAVEL_MODES.map((travel) => (
                            <a
                              key={travel.id}
                              href={directionsUrlBetween(from, DESTINATION, travel.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMode(travel.id)}
                              className={`rounded-full px-3 py-1.5 text-xs transition duration-150 ${
                                mode === travel.id
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {travel.label}で見る ↗
                            </a>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs leading-relaxed text-stone-500">
                        駅を選ぶと、西山公園までの距離を出します。
                      </p>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-stone-500">
                    最寄りの
                    <strong className="font-semibold text-stone-700">
                      西山公園駅は出発地の選択肢にありません
                    </strong>
                    。手元のオープンデータに鉄道駅そのものの座標が無いためです。鯖江市は同駅から徒歩1分と案内しています。
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
                    公園に直接停まるのは{PARK_ROUTES.join('・')}のみです（バス停{BUS_STOPS.length}
                    件の路線名から集計）。園内には誰でも使えるトイレが{PARK_TOILETS.length}箇所あり、うち
                    {BARRIER_FREE}箇所がバリアフリー対応です。
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-400">{GEO_SOURCE.note}</p>
                </>
              )}

              {panel === 'highlights' && highlight && (
                <>
                  <PanelHead
                    title="見どころ"
                    lead="見頃の時期は日別来訪者数から機械的に導いたものです。"
                    onClose={() => setPanel(null)}
                  />

                  <div
                    role="tablist"
                    aria-label="見どころの時期"
                    className="mt-5 flex gap-1 overflow-x-auto"
                    onKeyDown={(event) => {
                      const step =
                        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                      if (step === 0) return;
                      event.preventDefault();
                      const at = highlights.findIndex((item) => item.id === highlight.id);
                      const next = highlights[(at + step + highlights.length) % highlights.length];
                      if (!next) return;
                      setHighlightId(next.id);
                      setViewerIndex(null);
                      document.getElementById(`tab-${next.id}`)?.focus();
                    }}
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
                          onClick={() => {
                            setHighlightId(item.id);
                            setViewerIndex(null);
                          }}
                          className={`flex shrink-0 items-baseline gap-2 rounded-t-xl px-5 py-2.5 transition duration-150 ${
                            on
                              ? 'bg-white text-stone-900'
                              : 'bg-brand-100 text-brand-800/70 hover:bg-brand-200 hover:text-brand-900'
                          }`}
                        >
                          <span className="text-sm font-bold">{item.title}</span>
                          {item.window && (
                            <span className="text-xs font-normal text-stone-400 tabular-nums">
                              {item.window}
                            </span>
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
                        <li
                          key={photo.card}
                          className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200"
                        >
                          <div className="flex items-center gap-2.5 px-3.5 py-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                className="h-4 w-4 text-white"
                              >
                                <path d="M12 21v-5M7 16h10l-5-6.5L7 16Zm1.5-6h7L12 4l-3.5 6Z" />
                              </svg>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-stone-900">
                                西山公園
                              </span>
                              <span className="block truncate text-xs text-stone-500">
                                福井県鯖江市
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewerIndex(index)}
                            aria-label={`${highlight.title} ${index + 1}枚目を大きく見る`}
                            className="group block w-full cursor-zoom-in overflow-hidden"
                          >
                            <img
                              src={photo.card}
                              width={800}
                              height={800}
                              alt={`${highlight.title} ${index + 1}`}
                              loading="lazy"
                              className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          </button>

                          <div className="flex items-center gap-1 px-2.5 pt-2.5">
                            <CardAction
                              label="大きく見る"
                              icon="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5M11 8v6M8 11h6"
                              onClick={() => setViewerIndex(index)}
                            />
                            <CardAction
                              label="地図で見る"
                              icon="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                              onClick={() => setPanel('around')}
                            />
                            <CardAction
                              label={copied ? 'コピーしました' : 'リンクをコピー'}
                              icon={
                                copied
                                  ? 'm5 13 4 4L19 7'
                                  : 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5'
                              }
                              onClick={copyLink}
                            />
                          </div>

                          {photo.caption && (
                            <p className="px-3.5 pt-2 pb-4 text-sm leading-relaxed text-stone-700">
                              {photo.caption}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {panel === 'sources' && (
                <>
                  <PanelHead
                    title="データの出典と注意点"
                    lead="この画面の数字と位置は、すべて公開されているデータから出しています。"
                    onClose={() => setPanel(null)}
                  />
                  <p className="mt-4 text-xs leading-relaxed text-stone-500">
                    出典: 鯖江市オープンデータ（日別来訪者数・観光・公共トイレ・バス停 / CC BY 2.1） /
                    天気予報は Open-Meteo / 地図は{' '}
                    <a
                      href="https://maps.gsi.go.jp/development/ichiran.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
                    >
                      地理院タイル
                    </a>
                    （国土地理院）。
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
                    予想人出は過去実績にもとづく推計値、距離は公開座標からの直線距離です。実際の混雑や徒歩時間を保証するものではありません。
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
                    徒歩1分・約15分は{' '}
                    <a
                      href="https://www.city.sabae.fukui.jp/kurashi_tetsuduki/doro_kasen_koen/koen/nishiyama/nishiyama_kotsu.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
                    >
                      鯖江市「西山公園 交通のご案内」
                    </a>
                    の記載です。JR鯖江駅までの距離は市の案内が約1.2km、公開座標からの実測が
                    {STATIONS.find((station) => station.name === '鯖江駅')?.distanceM.toLocaleString()}
                    mで一致しません。駅舎のどこを起点にするかで差が出ます。
                  </p>
                  <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-400">
                    オープンデータ活用アプリコンテスト2026 応募作品（主催: 鯖江市 / 企画運営:
                    NPO法人エル・コミュニティ）
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {panel === 'highlights' && (
        <NextStep
          label="公園の近くに何があるか見る"
          onClick={() => setPanel('around')}
          floating
        />
      )}

      {viewerIndex !== null && highlight && (
        <PhotoViewer
          photos={highlight.photos}
          index={viewerIndex}
          caption={highlight.title}
          onMove={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};
