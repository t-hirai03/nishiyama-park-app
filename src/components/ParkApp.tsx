import { useMemo, useState } from 'react';
import { LAYERS, ParkMap, type LayerId } from './ParkMap';
import { ParkPanelNav, type PanelId } from './ParkPanelNav';
import { PhotoViewer } from './PhotoViewer';
import {
  BUS_STOPS,
  GENRE_ORDER,
  GEO_SOURCE,
  NEARBY_SPOTS,
  PARK_PLACES,
  PARK_ROUTES,
  STATIONS,
  TOILETS,
  TRAVEL_MODES,
  directionsUrlBetween,
  groupBusStops,
  haversineM,
  primaryGenre,
  roundTripM,
  routeUrl,
  spotKey,
  walkMinutesOf,
  type Anchor,
  type Genre,
  type Placed,
  type Spot,
  type TravelMode,
} from '../lib/geo';

/** Googleマップの経路URLが受け取れる中継地点の上限 */
const MAX_STOPS = 9;

export interface HighlightPhoto {
  readonly src: string;
  readonly width: number;
  readonly height: number;
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

const WALKABLE_STATIONS = STATIONS.filter((station) => station.walkMinutes <= 15);
const PARK_BUS_STOPS = groupBusStops(BUS_STOPS.filter((stop) => stop.distanceM <= 300));
const PARK_TOILETS = TOILETS.filter((toilet) => toilet.inPark);
const BARRIER_FREE = PARK_TOILETS.filter((toilet) => toilet.barrierFree).length;
const LINKED_SPOTS = NEARBY_SPOTS.filter((spot) => spot.homepage).length;
const ORIGINS: readonly Anchor[] = [...WALKABLE_STATIONS, ...PARK_BUS_STOPS];

/** これを超えたら歩く距離ではないので徒歩時間を出さない */
const FAR_M = 5_000;

type OriginKind = 'preset' | 'current' | 'picked';

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

const PanelHead = ({ title, lead }: { title: string; lead: string }) => (
  <>
    <h2 className="text-base font-bold tracking-tight text-stone-900">{title}</h2>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">{lead}</p>
  </>
);

export const ParkApp = ({ highlights }: { highlights: readonly Highlight[] }) => {
  const [panel, setPanel] = useState<PanelId | null>('around');
  const [active, setActive] = useState<ReadonlySet<LayerId>>(
    () => new Set(LAYERS.map((layer) => layer.id))
  );
  const [genres, setGenres] = useState<ReadonlySet<Genre>>(() => new Set(GENRE_ORDER));
  const [focus, setFocus] = useState<Placed | null>(null);
  const [stops, setStops] = useState<readonly Spot[]>([]);
  // 現在地と地図で指した地点はどちらも候補外の座標なので、種類を別に持つ
  const [from, setFrom] = useState<{ kind: OriginKind; place: Anchor } | null>(null);
  const [to, setTo] = useState<Anchor>(PARK_PLACES[0] as Anchor);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [picking, setPicking] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [highlightId, setHighlightId] = useState(highlights[0]?.id ?? '');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  const visibleSpots = useMemo(
    () =>
      NEARBY_SPOTS.filter((spot) => {
        const genre = primaryGenre(spot);
        return genre ? genres.has(genre) : false;
      }),
    [genres]
  );

  const selectedKeys = useMemo(() => new Set(stops.map(spotKey)), [stops]);
  const linkM = useMemo(() => (from ? Math.round(haversineM(from.place, to)) : 0), [from, to]);
  const totalM = useMemo(() => Math.round(roundTripM(stops)), [stops]);

  const toggleStop = (spot: Spot) =>
    setStops((current) =>
      current.some((stop) => spotKey(stop) === spotKey(spot))
        ? current.filter((stop) => spotKey(stop) !== spotKey(spot))
        : current.length >= MAX_STOPS
          ? current
          : [...current, spot]
    );

  const highlight = highlights.find((item) => item.id === highlightId) ?? highlights[0];

  return (
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      <ParkPanelNav
        current={panel}
        spotCount={NEARBY_SPOTS.length}
        onSelect={(id) => setPanel((value) => (value === id ? null : id))}
      />

      <div className="relative flex flex-1 flex-col lg:block lg:min-h-0">
        <main className="h-[55dvh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
          <ParkMap
            active={active}
            onToggleLayer={toggleLayer}
            focus={focus}
            route={stops}
            link={from ? { from: from.place, to } : null}
            marker={from && from.kind !== 'preset' ? from.place : null}
            picking={picking}
            onPick={(point) => {
              setFrom({ kind: 'picked', place: { name: '地図で指した地点', ...point } });
              setPicking(false);
              setGeoError(null);
            }}
            panelOpen={panel !== null}
          />
        </main>

        {panel && (
          <div className="lg:pointer-events-none lg:absolute lg:inset-y-0 lg:left-0 lg:z-900 lg:w-[27rem] lg:max-w-[calc(100%-1.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-4">
            <div className="bg-stone-50 px-4 py-5 sm:px-5 lg:pointer-events-auto lg:rounded-3xl lg:bg-white/95 lg:shadow-lg lg:ring-1 lg:ring-stone-200 lg:backdrop-blur">
              {panel === 'around' && (
                <>
                  <PanelHead
                    title="公園を出てから、どこへ寄れるか"
                    lead={`鯖江市の観光データから半径900m以内のスポット${NEARBY_SPOTS.length}件。名前を押すと地図が寄り、＋を押すと公園から回るルートに入ります。`}
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

                  <div className="mt-4 rounded-2xl bg-brand-50 p-4">
                    <p className="text-xs font-bold text-brand-800">
                      寄り道ルート
                      <span className="ml-2 font-normal text-stone-500">
                        {stops.length}/{MAX_STOPS}件
                      </span>
                    </p>
                    {stops.length === 0 ? (
                      <p className="mt-2 text-xs leading-relaxed text-stone-500">
                        行きたい場所を選ぶと、公園を出て順に回り公園へ戻るルートを作ります。
                      </p>
                    ) : (
                      <>
                        <ol className="mt-2.5 space-y-1">
                          {stops.map((stop, index) => (
                            <li
                              key={spotKey(stop)}
                              className="flex items-baseline gap-2 text-xs text-stone-700"
                            >
                              <span className="tabular-nums text-stone-400">{index + 1}.</span>
                              <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                              <button
                                type="button"
                                onClick={() => toggleStop(stop)}
                                className="shrink-0 text-stone-400 transition duration-150 hover:text-rose-700"
                                aria-label={`${stop.name}をルートから外す`}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ol>
                        <p className="mt-3 text-sm font-bold text-stone-900 tabular-nums">
                          合計 約{(totalM / 1000).toFixed(1)}km
                          <span className="mx-1.5 font-normal text-stone-400">/</span>
                          徒歩{walkMinutesOf(totalM)}分
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          公園を起点に戻るまでの直線距離の合計です。実際の経路とは異なります。
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={routeUrl(stops)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-medium text-white transition duration-150 hover:bg-brand-700"
                          >
                            Googleマップで開く ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => setStops([])}
                            className="rounded-full bg-white px-3.5 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 transition duration-150 hover:bg-stone-100"
                          >
                            クリア
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <ul className="mt-4">
                    {visibleSpots.map((spot) => {
                      const selected = selectedKeys.has(spotKey(spot));
                      return (
                        <li
                          key={spotKey(spot)}
                          className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 transition duration-150 hover:bg-brand-50"
                        >
                          <button
                            type="button"
                            onClick={() => setFocus(spot)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-sm font-bold text-stone-900">
                              {spot.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-stone-400">
                              {spot.category}・{spot.distanceM}m / 徒歩{spot.walkMinutes}分
                            </span>
                          </button>
                          {spot.homepage && (
                            <a
                              href={spot.homepage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs text-stone-400 transition duration-150 hover:text-brand-700"
                              aria-label={`${spot.name}のサイトを開く`}
                            >
                              ↗
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleStop(spot)}
                            aria-pressed={selected}
                            aria-label={
                              selected ? `${spot.name}をルートから外す` : `${spot.name}をルートに追加`
                            }
                            disabled={!selected && stops.length >= MAX_STOPS}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition duration-150 disabled:opacity-30 ${
                              selected
                                ? 'bg-brand-600 text-white'
                                : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                            }`}
                          >
                            {selected ? '✓' : '+'}
                          </button>
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
                    ↗ はデータセットに収録されたURLへのリンクです（{LINKED_SPOTS}/
                    {NEARBY_SPOTS.length}件）。収録時点のURLなので、現在は繋がらない場合があります。
                  </p>
                </>
              )}

              {panel === 'access' && (
                <>
                  <PanelHead
                    title="ここから、どれくらいか"
                    lead="出発地と園内の目的地を選ぶと、直線距離と徒歩時間を出します。現在地や地図で指した地点も使えます。"
                  />

                  <p className="mt-4 text-xs font-bold text-stone-900">出発地</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip
                      on={from?.kind === 'current'}
                      label={locating ? '取得中…' : '現在地'}
                      onClick={() => {
                        setPicking(false);
                        setGeoError(null);
                        if (!navigator.geolocation) {
                          setGeoError('この端末では現在地を取得できません。');
                          return;
                        }
                        setLocating(true);
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setFrom({
                              kind: 'current',
                              place: {
                                name: '現在地',
                                lat: position.coords.latitude,
                                lon: position.coords.longitude,
                              },
                            });
                            setLocating(false);
                          },
                          () => {
                            setGeoError('現在地を取得できませんでした。位置情報の許可を確認してください。');
                            setLocating(false);
                          },
                          { timeout: 10_000 }
                        );
                      }}
                    />
                    <Chip
                      on={picking || from?.kind === 'picked'}
                      label={picking ? '地図を押して指定' : '地図で指す'}
                      onClick={() => {
                        setPicking((current) => !current);
                        setGeoError(null);
                      }}
                    />
                    {ORIGINS.map((place) => (
                      <Chip
                        key={spotKey(place)}
                        on={from?.kind === 'preset' && spotKey(from.place) === spotKey(place)}
                        label={place.name}
                        onClick={() => {
                          setFrom({ kind: 'preset', place });
                          setPicking(false);
                          setGeoError(null);
                        }}
                      />
                    ))}
                  </div>

                  <p className="mt-5 text-xs font-bold text-stone-900">園内のどこへ</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PARK_PLACES.map((place) => (
                      <Chip
                        key={spotKey(place)}
                        on={spotKey(to) === spotKey(place)}
                        label={place.name}
                        onClick={() => setTo(place)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-brand-50 p-4">
                    {geoError ? (
                      <p className="text-xs leading-relaxed text-rose-700">{geoError}</p>
                    ) : from ? (
                      <>
                        <p className="text-xs text-stone-500">
                          {from.place.name} → {to.name}
                        </p>
                        <p className="mt-1.5 text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
                          {linkM >= 1000
                            ? `${(linkM / 1000).toFixed(1)}`
                            : linkM.toLocaleString()}
                          <span className="ml-1 text-base font-medium text-stone-500">
                            {linkM >= 1000 ? 'km' : 'm'}
                          </span>
                          {linkM <= FAR_M && (
                            <span className="ml-3 text-base font-medium text-stone-500">
                              徒歩{walkMinutesOf(linkM)}分
                            </span>
                          )}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                          {linkM <= FAR_M
                            ? '直線距離を80m=1分・切り上げで換算した目安です。実際の経路とは異なります。'
                            : '歩く距離ではないので、徒歩時間は出していません。下から移動手段を選ぶとGoogleマップで所要時間が見られます。'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {TRAVEL_MODES.map((travel) => (
                            <a
                              key={travel.id}
                              href={directionsUrlBetween(from.place, to, travel.id)}
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
                        出発地を選ぶと、そこから園内の目的地までの距離を出します。
                      </p>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-stone-500">
                    園内の地点の座標は
                    <strong className="font-semibold text-stone-700">公共トイレのデータ</strong>
                    から取っています。中央広場・冒険の森・嚮陽庭園は園内の地点名そのものなので、そのままランドマークの座標として使えます。
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
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
                    lead="見頃の時期は日別来訪者数から機械的に導いたものです。時期を選ぶと写真が切り替わります。"
                  />

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {highlights.map((item) => (
                      <Chip
                        key={item.id}
                        on={item.id === highlight.id}
                        label={item.title}
                        onClick={() => {
                          setHighlightId(item.id);
                          setViewerIndex(null);
                        }}
                      />
                    ))}
                  </div>

                  <p className="mt-4 text-sm font-bold text-stone-900">
                    {highlight.title}
                    {highlight.window && (
                      <span className="ml-2 text-xs font-normal text-stone-400">
                        {highlight.window}
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{highlight.lead}</p>
                  <ul className="mt-3 grid grid-cols-3 gap-2">
                    {highlight.photos.map((photo, index) => (
                      <li key={photo.src}>
                        <button
                          type="button"
                          onClick={() => setViewerIndex(index)}
                          aria-label={`${highlight.title} ${index + 1}枚目を大きく見る`}
                          className="block w-full cursor-zoom-in overflow-hidden rounded-lg ring-brand-600 transition duration-150 hover:ring-2 focus-visible:ring-2"
                        >
                          <img
                            src={photo.src}
                            width={photo.width}
                            height={photo.height}
                            alt={`${highlight.title} ${index + 1}`}
                            loading="lazy"
                            className="aspect-[4/3] w-full object-cover transition duration-150 hover:scale-105"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-stone-400">写真を押すと大きく表示します。</p>
                </>
              )}

              {panel === 'sources' && (
                <>
                  <PanelHead
                    title="データの出典と注意点"
                    lead="この画面の数字と位置は、すべて公開されているデータから出しています。"
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
