import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GENRE_CLASS, MARKER_CLASS } from '../../constants/colors';
import { GENRE_GLYPH } from '../../constants/glyphs';
import {
  BUS_STOPS,
  NEARBY_SPOTS,
  ORIGIN_STATIONS,
  PARK,
  PARK_PLACE,
  PRESENT_GENRES,
  TOILETS,
  groupBusStops,
  primaryGenre,
  spotKey,
} from '../../lib/geo';
import type { Anchor, Placed } from '../../types/geo';
import type { BaseMapId, LayerId } from '../../types/ui';
import {
  BASE_MAPS,
  DEFAULT_BASE_MAP,
  GSI_ATTRIBUTION,
  OUTER_RING_M,
  WALK_RINGS,
  casedLine,
  pin,
  popupHtml,
  tileUrl,
  toLatLng,
  walkRing,
} from './leaflet';
import { MapControls } from './MapControls';

interface ParkMapProps {
  /** 表示中の種類。パネル側のチップと共有する */
  readonly active: ReadonlySet<LayerId>;
  readonly onToggleLayer: (id: LayerId) => void;
  /** 寄せたい地点。一覧の行を押したときに変わる */
  readonly focus: Placed | null;
  /** 2地点を結ぶ直線。アクセスで出発地と目的地を選んだときに引く */
  readonly link: { readonly from: Anchor; readonly to: Anchor } | null;
  /** パネルが地図に重なっているか。自動フィットの余白に効く */
  readonly panelOpen: boolean;
}

/** パネルは地図の左に重なるので、その幅を除いた範囲に収めないと内容が隠れる */
const PANEL_INSET = 456;
const EDGE = 24;

interface MarkerRegistry {
  readonly layers: Map<LayerId, L.LayerGroup>;
  readonly markers: Map<string, L.Marker>;
}

const addMarkers = (instance: L.Map, registry: MarkerRegistry): void => {
  const groupFor = (id: LayerId) => {
    const existing = registry.layers.get(id);
    if (existing) return existing;
    const created = L.layerGroup().addTo(instance);
    registry.layers.set(id, created);
    return created;
  };
  const register = (point: Placed, marker: L.Marker) =>
    registry.markers.set(spotKey(point), marker);

  for (const genre of PRESENT_GENRES) {
    const group = groupFor(genre);
    for (const spot of NEARBY_SPOTS.filter((s) => primaryGenre(s) === genre)) {
      const detail = `${spot.category}・${spot.distanceM}m / 徒歩${spot.walkMinutes}分`;
      register(
        spot,
        pin(spot, GENRE_CLASS[genre].text, GENRE_GLYPH[genre], 28)
          .bindPopup(popupHtml(spot, detail, spot.address))
          .addTo(group)
      );
    }
  }

  const accessGroup = groupFor('access');
  for (const station of ORIGIN_STATIONS) {
    const detail = `公園まで${station.distanceM}m / 徒歩${station.walkMinutes}分`;
    register(
      station,
      pin(station, MARKER_CLASS.station, 'station', 34)
        .bindPopup(popupHtml(station, detail))
        .addTo(accessGroup)
    );
  }
  for (const stop of groupBusStops(BUS_STOPS.filter((s) => s.distanceM <= 300))) {
    const detail = `バス停・${stop.routes.join('・')}／公園まで${stop.distanceM}m`;
    register(
      stop,
      pin(stop, MARKER_CLASS.busStop, 'bus', 26).bindPopup(popupHtml(stop, detail)).addTo(accessGroup)
    );
  }

  const toiletGroup = groupFor('toilet');
  for (const toilet of TOILETS) {
    const detail = `トイレ・男${toilet.male} 女${toilet.female}${toilet.barrierFree ? '・バリアフリーあり' : ''}`;
    pin(toilet, MARKER_CLASS.toilet, 'toilet', 24)
      .bindPopup(popupHtml(toilet, detail))
      .addTo(toiletGroup);
  }

  pin(PARK_PLACE, MARKER_CLASS.park, 'park', 44)
    .bindPopup(popupHtml(PARK_PLACE, '西山公園（日本の歴史公園100選）'))
    .addTo(instance);
};

export const ParkMap = ({ active, onToggleLayer, focus, link, panelOpen }: ParkMapProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const registry = useRef<MarkerRegistry>({ layers: new Map(), markers: new Map() });
  const linkLine = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const tiles = useRef<L.TileLayer | null>(null);
  const map = useRef<L.Map | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [tilesReady, setTilesReady] = useState(false);

  const fitOptions = (): L.FitBoundsOptions => {
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    return panelOpen && wide
      ? {
          paddingTopLeft: L.point(PANEL_INSET, EDGE),
          paddingBottomRight: L.point(EDGE, EDGE),
        }
      : { padding: L.point(EDGE, EDGE) };
  };

  /**
   * 初期表示が見どころのときは地図が display:none で始まるため、Leafletが
   * サイズ0で初期化される。その状態で fitBounds すると倍率が壊れるので、
   * 実寸が付くまで待ち、ResizeObserver 側から呼び直す。
   */
  const fitInitialBounds = () => {
    const instance = map.current;
    const node = container.current;
    if (!instance || !node || fitted.current) return;
    if (node.clientWidth === 0 || node.clientHeight === 0) return;
    // L.Circle#getBounds は地図に追加済みでないと使えないため latLng#toBounds を使う
    instance.fitBounds(
      L.latLngBounds([...NEARBY_SPOTS.map(toLatLng), toLatLng(PARK)]).extend(
        L.latLng(PARK.lat, PARK.lon).toBounds(OUTER_RING_M * 2)
      ),
      fitOptions()
    );
    fitted.current = true;
  };

  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    for (const { meters, label } of WALK_RINGS) {
      walkRing(PARK, meters).bindTooltip(`${label}（${meters}m）`, { sticky: true }).addTo(instance);
    }
    addMarkers(instance, registry.current);

    map.current = instance;
    fitInitialBounds();

    const { layers, markers } = registry.current;
    return () => {
      instance.remove();
      map.current = null;
      tiles.current = null;
      linkLine.current = null;
      layers.clear();
      markers.clear();
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const preset = BASE_MAPS.find((item) => item.id === baseMap) ?? BASE_MAPS[0];

    setTilesReady(false);
    tiles.current?.remove();
    const layer = L.tileLayer(tileUrl(preset), {
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
    for (const [id, group] of registry.current.layers) {
      if (active.has(id)) group.addTo(instance);
      else group.removeFrom(instance);
    }
  }, [active]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !focus) return;
    instance.flyTo(toLatLng(focus), Math.max(instance.getZoom(), 16), { duration: 0.6 });
    registry.current.markers.get(spotKey(focus))?.openPopup();
  }, [focus]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    linkLine.current?.remove();
    linkLine.current = null;
    if (!link) return;
    const path = [toLatLng(link.from), toLatLng(link.to)];
    linkLine.current = casedLine(path, 5).addTo(instance);
    instance.fitBounds(L.latLngBounds(path), fitOptions());
  }, [link]);

  /**
   * 修飾キーを押している間だけホイールで拡大縮小する。修飾キーなしのホイールは
   * ページのスクロールに残したいので、Leafletのハンドラを都度切り替える。
   * 地図コンテナ自身に付けるとLeafletのリスナと発火順が登録順になってしまうため、
   * 親要素のキャプチャ段階で拾う。トラックパッドのピンチは ctrlKey つきの
   * wheel イベントとして来るので、これで一緒に拾える。
   */
  useEffect(() => {
    const instance = map.current;
    const node = wrapper.current;
    if (!instance || !node) return;

    const onWheel = (event: WheelEvent) => {
      if (event.metaKey || event.ctrlKey) instance.scrollWheelZoom.enable();
      else instance.scrollWheelZoom.disable();
    };

    node.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => node.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  // 高さを親のレイアウトに任せるので、サイズ変更をLeafletに伝えないとタイルが欠ける
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      map.current?.invalidateSize();
      fitInitialBounds();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="relative h-full min-h-[20rem] w-full">
      <div ref={container} className="h-full w-full" />

      <MapControls
        baseMap={baseMap}
        onBaseMap={setBaseMap}
        active={active}
        onToggleLayer={onToggleLayer}
      />

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
