import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BUS_STOPS,
  GENRE_COLOR_VAR,
  GENRE_ORDER,
  MAP_COLOR_VAR,
  cssColor,
  NEARBY_SPOTS,
  PARK,
  STATIONS,
  TOILETS,
  groupBusStops,
  primaryGenre,
  spotKey,
  type Genre,
  type Placed,
} from '../lib/geo';

const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>（国土地理院）';

/**
 * 地理院タイルは種類ごとに提供ズームが違う。白地図はZL14、Englishは11、
 * 陰影起伏図は12までで園内を見る倍率に足りないため、この3種に絞っている。
 * 写真はZL14からなので、切り替え時に倍率を引き上げる必要がある。
 */
const BASE_MAPS = [
  { id: 'photo', label: '写真', url: 'seamlessphoto/{z}/{x}/{y}.jpg', minZoom: 14, maxNativeZoom: 18 },
  { id: 'pale', label: '淡色', url: 'pale/{z}/{x}/{y}.png', minZoom: 5, maxNativeZoom: 18 },
  { id: 'std', label: '標準', url: 'std/{z}/{x}/{y}.png', minZoom: 5, maxNativeZoom: 18 },
] as const;

const DEFAULT_BASE_MAP: BaseMapId = 'photo';


type BaseMapId = (typeof BASE_MAPS)[number]['id'];

const WALK_RINGS = [
  { meters: 400, label: '徒歩5分' },
  { meters: 800, label: '徒歩10分' },
] as const;
const OUTER_RING_M = 800;

export type LayerId = Genre | 'access' | 'toilet';

const PRESENT_GENRES = GENRE_ORDER.filter((genre) =>
  NEARBY_SPOTS.some((spot) => primaryGenre(spot) === genre)
);

const GENRE_GLYPH: Record<Genre, GlyphId> = {
  観る: 'see',
  食べる: 'eat',
  買う: 'buy',
  遊ぶ: 'play',
};

export const LAYERS: readonly { id: LayerId; label: string; colorVar: string }[] = [
  ...PRESENT_GENRES.map((genre) => ({
    id: genre as LayerId,
    label: genre,
    colorVar: GENRE_COLOR_VAR[genre],
  })),
  { id: 'access', label: '駅・バス停', colorVar: MAP_COLOR_VAR.station },
  { id: 'toilet', label: 'トイレ', colorVar: MAP_COLOR_VAR.toilet },
];

type ControlId = 'base' | 'layers';

const CONTROLS: readonly { id: ControlId; label: string; icon: string }[] = [
  {
    id: 'base',
    label: '地図の種類',
    icon: 'm12 3 9 4.5-9 4.5-9-4.5L12 3Zm9 9-9 4.5L3 12m18 4.5-9 4.5-9-4.5',
  },
  {
    id: 'layers',
    label: '表示する場所',
    icon: 'M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
];

const directionsUrl = (point: Placed) =>
  `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}&travelmode=walking`;

const popupHtml = (point: Placed, detail: string) => `
  <p class="text-sm font-bold text-stone-900">${point.name}</p>
  <p class="mt-0.5 text-xs text-stone-500">${detail}</p>
  <a href="${directionsUrl(point)}" target="_blank" rel="noopener noreferrer"
     class="mt-2 inline-block text-xs font-medium text-brand-700 underline underline-offset-4">
    Googleマップで経路を見る ↗
  </a>`;

/**
 * ピンの中に入れるアイコン。24x24で描いて、ピンの頭に縮小して載せる。
 * 小さく出るので線は太めにし、形の数を絞っている。
 */
const PIN_GLYPH = {
  see: '<path d="M1.5 12S5.5 6 12 6s10.5 6 10.5 6-4 6-10.5 6S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
  eat: '<path d="M8.5 3v18M5.5 3v5.5a3 3 0 0 0 6 0V3M16.5 21V13m0 0c-1.8 0-2.8-1.6-2.8-4.5S14.7 3 16.5 3s2.8 2.6 2.8 5.5-1 4.5-2.8 4.5Z"/>',
  buy: '<path d="M5.5 8h13l-1.2 12.5H6.7L5.5 8Zm3.6 0V5.8a2.9 2.9 0 0 1 5.8 0V8"/>',
  play: '<path d="M12 21v-4.5M6.5 16.5h11L12 7l-5.5 9.5Z"/>',
  park: '<path d="M12 21v-5M7 16h10l-5-6.5L7 16Zm1.5-6h7L12 4l-3.5 6Z"/>',
  station:
    '<path d="M7.5 3.5h9a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Zm-2 4.5h13M9.5 12h.5m4.5 0h.5M8.5 16 6.5 20.5m9-4.5 2 4.5"/>',
  bus: '<path d="M5.5 5.5h13v9.5h-13V5.5Zm0 4.5h13M8 15v3m8-3v3M9 8h6"/>',
  toilet:
    '<path d="M12 4.5v15"/><path d="M7.5 8.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 0c-1.3 0-2 .9-2 2v4h1.2v5h1.6v-5H9.5v-4c0-1.1-.7-2-2-2Z"/><path d="M16.5 8.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm0 0c-1.4 0-2.1 1-2.3 2.2l-.7 4.3h1.4v4.5h3.2V15h1.4l-.7-4.3c-.2-1.2-.9-2.2-2.3-2.2Z"/>',
} as const;

type GlyphId = keyof typeof PIN_GLYPH;

/** 頭の円の中心が (14,13)、先端が (14,35) の水滴形 */
const PIN_SHAPE = 'M14 1c-6.6 0-12 5.4-12 12 0 8.6 12 22 12 22s12-13.4 12-22c0-6.6-5.4-12-12-12Z';

const pinIcon = (colorVar: string, glyph: GlyphId, width: number) => {
  const height = Math.round((width * 36) / 28);
  const svg = `<svg viewBox="0 0 28 36" width="${width}" height="${height}" aria-hidden="true">
      <path class="park-pin-body" d="${PIN_SHAPE}" />
      <g transform="translate(14 13) scale(0.5) translate(-12 -12)"
         fill="none" stroke="var(--color-marker-edge)" stroke-width="2.6"
         stroke-linecap="round" stroke-linejoin="round" color="var(--color-marker-edge)">
        ${PIN_GLYPH[glyph]}
      </g>
    </svg>`;
  return L.divIcon({
    className: 'park-pin-wrap',
    html: `<span class="park-pin" style="--pin-color: var(${colorVar})">${svg}</span>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  });
};

const pin = (point: Placed, colorVar: string, glyph: GlyphId, width: number) =>
  L.marker([point.lat, point.lon], { icon: pinIcon(colorVar, glyph, width), title: point.name });

const Pill = ({
  on,
  colorVar,
  label,
  onClick,
}: {
  on: boolean;
  colorVar?: string;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition duration-150 ${
      on
        ? 'bg-brand-600 text-white'
        : 'bg-brand-50 text-stone-500 hover:bg-brand-100'
    }`}
  >
    {colorVar && (
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: `var(${on ? colorVar : MAP_COLOR_VAR.markerOff})` }}
      />
    )}
    {label}
  </button>
);

export interface ParkMapProps {
  /** 表示中の種類。パネル側のチップと共有する */
  readonly active: ReadonlySet<LayerId>;
  readonly onToggleLayer: (id: LayerId) => void;
  /** 寄せたい地点。一覧の行を押したときに変わる */
  readonly focus: Placed | null;
  /** 周遊ルート。公園発・公園着で結ぶ */
  readonly route: readonly Placed[];
  /** 公園と結ぶ直線。アクセスの出発地を選んだときに引く */
  readonly link: Placed | null;
  /** パネルが地図に重なっているか。自動フィットの余白に効く */
  readonly panelOpen: boolean;
}

/** パネルは地図の左に重なるので、その幅を除いた範囲に収めないと内容が隠れる */
const PANEL_INSET = 456;
const EDGE = 24;

export const ParkMap = ({ active, onToggleLayer, focus, route, link, panelOpen }: ParkMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<LayerId, L.LayerGroup>());
  const markers = useRef(new Map<string, L.Marker>());
  const routeLine = useRef<L.Polyline | null>(null);
  const linkLine = useRef<L.Polyline | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const map = useRef<L.Map | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [tilesReady, setTilesReady] = useState(false);
  const [openControl, setOpenControl] = useState<ControlId | null>(null);

  const fitOptions = (): L.FitBoundsOptions => {
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    return panelOpen && wide
      ? {
          paddingTopLeft: L.point(PANEL_INSET, EDGE),
          paddingBottomRight: L.point(EDGE, EDGE),
        }
      : { padding: L.point(EDGE, EDGE) };
  };

  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    for (const { meters, label } of WALK_RINGS) {
      L.circle([PARK.lat, PARK.lon], {
        radius: meters,
        color: cssColor(MAP_COLOR_VAR.ring),
        weight: 3,
        opacity: 0.85,
        dashArray: '8 9',
        fillColor: cssColor(MAP_COLOR_VAR.ring),
        fillOpacity: 0.04,
      })
        .bindTooltip(`${label}（${meters}m）`, { sticky: true })
        .addTo(instance);
    }

    const groupFor = (id: LayerId) => {
      const existing = layers.current.get(id);
      if (existing) return existing;
      const created = L.layerGroup().addTo(instance);
      layers.current.set(id, created);
      return created;
    };

    for (const genre of PRESENT_GENRES) {
      const group = groupFor(genre);
      for (const spot of NEARBY_SPOTS.filter((s) => primaryGenre(s) === genre)) {
        const marker = pin(spot, GENRE_COLOR_VAR[genre], GENRE_GLYPH[genre], 28)
          .bindPopup(popupHtml(spot, `${spot.category}・${spot.distanceM}m / 徒歩${spot.walkMinutes}分`))
          .addTo(group);
        markers.current.set(spotKey(spot), marker);
      }
    }

    const accessGroup = groupFor('access');
    for (const station of STATIONS.filter((s) => s.walkMinutes <= 15)) {
      const marker = pin(station, MAP_COLOR_VAR.station, 'station', 34)
        .bindPopup(popupHtml(station, `公園まで${station.distanceM}m / 徒歩${station.walkMinutes}分`))
        .addTo(accessGroup);
      markers.current.set(spotKey(station), marker);
    }
    for (const stop of groupBusStops(BUS_STOPS.filter((s) => s.distanceM <= 300))) {
      const marker = pin(stop, MAP_COLOR_VAR.busStop, 'bus', 26)
        .bindPopup(popupHtml(stop, `バス停・${stop.routes.join('・')}／公園まで${stop.distanceM}m`))
        .addTo(accessGroup);
      markers.current.set(spotKey(stop), marker);
    }

    const toiletGroup = groupFor('toilet');
    for (const toilet of TOILETS) {
      pin(toilet, MAP_COLOR_VAR.toilet, 'toilet', 24)
        .bindPopup(
          popupHtml(
            toilet,
            `トイレ・男${toilet.male} 女${toilet.female}${toilet.barrierFree ? '・バリアフリーあり' : ''}`
          )
        )
        .addTo(toiletGroup);
    }

    pin({ ...PARK, distanceM: 0, walkMinutes: 0 }, MAP_COLOR_VAR.park, 'park', 44)
      .bindPopup(popupHtml({ ...PARK, distanceM: 0, walkMinutes: 0 }, '西山公園（日本の歴史公園100選）'))
      .addTo(instance);

    // L.Circle#getBounds は地図に追加済みでないと使えないため latLng#toBounds を使う
    const bounds = L.latLngBounds([
      ...NEARBY_SPOTS.map((spot) => [spot.lat, spot.lon] as [number, number]),
      [PARK.lat, PARK.lon],
    ]).extend(L.latLng(PARK.lat, PARK.lon).toBounds(OUTER_RING_M * 2));
    instance.fitBounds(bounds, fitOptions());
    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
      tiles.current = null;
      routeLine.current = null;
      linkLine.current = null;
      layers.current.clear();
      markers.current.clear();
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const preset = BASE_MAPS.find((item) => item.id === baseMap) ?? BASE_MAPS[0];

    setTilesReady(false);
    tiles.current?.remove();
    const layer = L.tileLayer(`https://cyberjapandata.gsi.go.jp/xyz/${preset.url}`, {
      attribution: GSI_ATTRIBUTION,
      minZoom: preset.minZoom,
      maxNativeZoom: preset.maxNativeZoom,
      maxZoom: 18,
    });
    layer.on('load', () => setTilesReady(true));
    layer.addTo(instance);
    layer.bringToBack();
    tiles.current = layer;

    // 提供ズームを下回ると真っ白になるので倍率を引き上げる
    if (instance.getZoom() < preset.minZoom) instance.setZoom(preset.minZoom);
    instance.setMinZoom(preset.minZoom);
  }, [baseMap]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    for (const [id, group] of layers.current) {
      if (active.has(id)) group.addTo(instance);
      else group.removeFrom(instance);
    }
  }, [active]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !focus) return;
    instance.flyTo([focus.lat, focus.lon], Math.max(instance.getZoom(), 16), { duration: 0.6 });
    markers.current.get(spotKey(focus))?.openPopup();
  }, [focus]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    routeLine.current?.remove();
    routeLine.current = null;
    if (route.length === 0) return;
    const path: [number, number][] = [
      [PARK.lat, PARK.lon],
      ...route.map((stop) => [stop.lat, stop.lon] as [number, number]),
      [PARK.lat, PARK.lon],
    ];
    routeLine.current = L.polyline(path, {
      color: cssColor(MAP_COLOR_VAR.route),
      weight: 4,
      opacity: 0.9,
    }).addTo(instance);
    instance.fitBounds(L.latLngBounds(path), fitOptions());
  }, [route]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    linkLine.current?.remove();
    linkLine.current = null;
    if (!link) return;
    const path: [number, number][] = [
      [PARK.lat, PARK.lon],
      [link.lat, link.lon],
    ];
    linkLine.current = L.polyline(path, {
      color: cssColor(MAP_COLOR_VAR.route),
      weight: 5,
      dashArray: '9 10',
      opacity: 0.95,
      lineCap: 'round',
    }).addTo(instance);
    instance.fitBounds(L.latLngBounds(path), fitOptions());
  }, [link]);

  // 高さを親のレイアウトに任せるので、サイズ変更をLeafletに伝えないとタイルが欠ける
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-full min-h-[20rem] w-full">
      <div ref={container} className="h-full w-full" />

      <div className="absolute top-3 right-3 z-900 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2">
        <div className="flex gap-2">
          {CONTROLS.map((control) => (
            <button
              key={control.id}
              type="button"
              onClick={() => setOpenControl((current) => (current === control.id ? null : control.id))}
              aria-expanded={openControl === control.id}
              aria-label={control.label}
              title={control.label}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition duration-150 ${
                openControl === control.id
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white/95 text-stone-600 ring-stone-200 backdrop-blur hover:text-stone-900'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path d={control.icon} />
              </svg>
              {control.id === 'layers' && active.size < LAYERS.length && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
              )}
            </button>
          ))}
        </div>

        {openControl === 'base' && (
          <div className="rounded-2xl bg-white/95 p-2.5 shadow-sm ring-1 ring-stone-200 backdrop-blur">
            <div className="flex justify-end gap-1.5">
              {BASE_MAPS.map((preset) => (
                <Pill
                  key={preset.id}
                  on={baseMap === preset.id}
                  label={preset.label}
                  onClick={() => setBaseMap(preset.id)}
                />
              ))}
            </div>
          </div>
        )}

        {openControl === 'layers' && (
          <div className="rounded-2xl bg-white/95 p-2.5 shadow-sm ring-1 ring-stone-200 backdrop-blur">
            <div className="flex flex-wrap justify-end gap-1.5">
              {LAYERS.map((layer) => (
                <Pill
                  key={layer.id}
                  on={active.has(layer.id)}
                  colorVar={layer.colorVar}
                  label={layer.label}
                  onClick={() => onToggleLayer(layer.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {!tilesReady && (
        <div className="pointer-events-none absolute inset-0 z-800 flex items-center justify-center bg-stone-100">
          <p className="animate-pulse text-sm text-stone-400">地図を読み込んでいます</p>
        </div>
      )}

      {active.size === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-800 flex justify-center">
          <p className="rounded-full bg-brand-800/90 px-4 py-2 text-xs text-white">
            表示する場所が選ばれていません
          </p>
        </div>
      )}
    </div>
  );
};
