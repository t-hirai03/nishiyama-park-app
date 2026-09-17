import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BUS_STOPS,
  GENRE_COLOR,
  MAP_COLOR,
  GENRE_ORDER,
  NEARBY_SPOTS,
  PARK,
  STATIONS,
  TOILETS,
  groupBusStops,
  primaryGenre,
  type Genre,
  type Placed,
} from '../lib/geo';

const GSI_TILE = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>（国土地理院）';
const WALK_RINGS = [
  { meters: 400, label: '徒歩5分' },
  { meters: 800, label: '徒歩10分' },
] as const;
const OUTER_RING_M = 800;

type LayerId = Genre | 'access' | 'toilet';

/** 該当スポットが0件のジャンルはボタンを出さない */
const PRESENT_GENRES = GENRE_ORDER.filter((genre) =>
  NEARBY_SPOTS.some((spot) => primaryGenre(spot) === genre)
);

const LAYERS: readonly { id: LayerId; label: string; color: string }[] = [
  ...PRESENT_GENRES.map((genre) => ({ id: genre as LayerId, label: genre, color: GENRE_COLOR[genre] })),
  { id: 'access', label: '駅・バス停', color: MAP_COLOR.station },
  { id: 'toilet', label: 'トイレ', color: MAP_COLOR.toilet },
];

const directionsUrl = (point: Placed) =>
  `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}&travelmode=walking`;

const popupHtml = (point: Placed, detail: string) => `
  <p class="text-sm font-bold text-stone-900">${point.name}</p>
  <p class="mt-0.5 text-xs text-stone-500">${detail}</p>
  <a href="${directionsUrl(point)}" target="_blank" rel="noopener noreferrer"
     class="mt-2 inline-block text-xs font-medium text-emerald-700 underline underline-offset-4">
    Googleマップで経路を見る ↗
  </a>`;

const dot = (point: Placed, color: string, radius: number) => {
  const marker = L.circleMarker([point.lat, point.lon], {
    radius,
    color: '#ffffff',
    weight: 2,
    fillColor: color,
    fillOpacity: 0.95,
  });
  marker.on('mouseover', () => marker.setStyle({ radius: radius + 4, weight: 3 }));
  marker.on('mouseout', () => marker.setStyle({ radius, weight: 2 }));
  return marker;
};

export const ParkMap = () => {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<LayerId, L.LayerGroup>());
  const map = useRef<L.Map | null>(null);
  const [active, setActive] = useState<Set<LayerId>>(
    () => new Set(LAYERS.map((layer) => layer.id))
  );
  const [tilesReady, setTilesReady] = useState(false);

  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = L.map(container.current, { scrollWheelZoom: false });
    const tiles = L.tileLayer(GSI_TILE, {
      attribution: GSI_ATTRIBUTION,
      maxZoom: 18,
      minZoom: 5,
    }).addTo(instance);
    tiles.on('load', () => setTilesReady(true));

    for (const { meters, label } of WALK_RINGS) {
      L.circle([PARK.lat, PARK.lon], {
        radius: meters,
        color: MAP_COLOR.ring,
        weight: 3,
        opacity: 0.85,
        dashArray: '8 9',
        fillColor: MAP_COLOR.ring,
        fillOpacity: 0.04,
        interactive: true,
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
        dot(spot, GENRE_COLOR[genre], 7)
          .bindPopup(popupHtml(spot, `${spot.category}・${spot.distanceM}m / 徒歩${spot.walkMinutes}分`))
          .addTo(group);
      }
    }

    const accessGroup = groupFor('access');
    for (const station of STATIONS.filter((s) => s.walkMinutes <= 15)) {
      dot(station, MAP_COLOR.station, 10)
        .bindPopup(popupHtml(station, `公園まで${station.distanceM}m / 徒歩${station.walkMinutes}分`))
        .addTo(accessGroup);
    }
    for (const stop of groupBusStops(BUS_STOPS.filter((s) => s.distanceM <= 300))) {
      dot(stop, MAP_COLOR.busStop, 6)
        .bindPopup(popupHtml(stop, `バス停・${stop.routes.join('・')}／公園まで${stop.distanceM}m`))
        .addTo(accessGroup);
    }

    const toiletGroup = groupFor('toilet');
    for (const toilet of TOILETS) {
      dot(toilet, MAP_COLOR.toilet, 5)
        .bindPopup(
          popupHtml(
            toilet,
            `トイレ・男${toilet.male} 女${toilet.female}${toilet.barrierFree ? '・バリアフリーあり' : ''}`
          )
        )
        .addTo(toiletGroup);
    }

    L.circleMarker([PARK.lat, PARK.lon], {
      radius: 13,
      color: '#ffffff',
      weight: 3,
      fillColor: MAP_COLOR.park,
      fillOpacity: 1,
    })
      .bindPopup(popupHtml({ ...PARK, distanceM: 0, walkMinutes: 0 }, '西山公園（日本の歴史公園100選）'))
      .addTo(instance);

    // 徒歩10分の円が切れると目安として読めないので、円の外接矩形も収める。
    // L.Circle#getBounds は地図に追加済みでないと使えないため latLng#toBounds を使う
    const bounds = L.latLngBounds([
      ...NEARBY_SPOTS.map((spot) => [spot.lat, spot.lon] as [number, number]),
      [PARK.lat, PARK.lon],
    ]).extend(L.latLng(PARK.lat, PARK.lon).toBounds(OUTER_RING_M * 2));
    instance.fitBounds(bounds, { padding: [24, 24] });
    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
      layers.current.clear();
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    for (const [id, group] of layers.current) {
      if (active.has(id)) group.addTo(instance);
      else group.removeFrom(instance);
    }
  }, [active]);

  // 高さを親のレイアウトに任せるので、サイズ変更をLeafletに伝えないとタイルが欠ける
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const toggle = (id: LayerId) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative h-full min-h-[22rem] w-full">
      <div ref={container} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-500 p-3 sm:p-4">
        <div className="pointer-events-auto ml-auto w-fit max-w-[calc(100%-4rem)] rounded-2xl bg-white/95 p-2.5 shadow-sm ring-1 ring-stone-200 backdrop-blur">
          <div className="flex flex-wrap justify-end gap-1.5">
            {LAYERS.map((layer) => {
              const on = active.has(layer.id);
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggle(layer.id)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition duration-150 ${
                    on ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: on ? layer.color : '#d6d3d1' }}
                  />
                  {layer.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!tilesReady && (
        <div className="pointer-events-none absolute inset-0 z-500 flex items-center justify-center bg-stone-100">
          <p className="animate-pulse text-sm text-stone-400">地図を読み込んでいます</p>
        </div>
      )}

      {active.size === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 z-500 flex justify-center">
          <p className="rounded-full bg-stone-900/85 px-4 py-2 text-xs text-white">
            表示する種類が選ばれていません
          </p>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-2 left-2 z-500 max-w-[22rem] rounded-xl bg-white/90 px-3 py-2 text-xs leading-relaxed text-stone-500 backdrop-blur">
        ピンを押すと名称と距離が出ます。破線は公園からの直線距離で徒歩5分（400m）と徒歩10分（800m）の目安。
      </p>
    </div>
  );
};
