import L from 'leaflet';
import { MAP_COLOR_VAR } from '../../constants/colors';
import { PIN_GLYPH } from '../../constants/glyphs';
import { directionsUrlTo, placeSearchUrl } from '../../lib/geo';
import type { Placed, Point } from '../../types/geo';
import type { BaseMapId, GlyphId } from '../../types/ui';
import { cssColor } from '../../utils/css';

export const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>（国土地理院）';

interface BaseMap {
  readonly id: BaseMapId;
  readonly label: string;
  readonly url: string;
  readonly minZoom: number;
  readonly maxNativeZoom: number;
}

/**
 * 地理院タイルは種類ごとに提供ズームが違う。白地図はZL14、Englishは11、
 * 陰影起伏図は12までで園内を見る倍率に足りないため、この3種に絞っている。
 * 写真はZL14からなので、切り替え時に倍率を引き上げる必要がある。
 */
export const BASE_MAPS: readonly [BaseMap, ...BaseMap[]] = [
  { id: 'photo', label: '写真', url: 'seamlessphoto/{z}/{x}/{y}.jpg', minZoom: 14, maxNativeZoom: 18 },
  { id: 'pale', label: '淡色', url: 'pale/{z}/{x}/{y}.png', minZoom: 5, maxNativeZoom: 18 },
  { id: 'std', label: '標準', url: 'std/{z}/{x}/{y}.png', minZoom: 5, maxNativeZoom: 18 },
];

export const DEFAULT_BASE_MAP: BaseMapId = 'photo';

export const tileUrl = (preset: BaseMap): string =>
  `https://cyberjapandata.gsi.go.jp/xyz/${preset.url}`;

export const WALK_RINGS = [
  { meters: 400, label: '徒歩5分' },
  { meters: 800, label: '徒歩10分' },
] as const;

export const OUTER_RING_M = 800;

export const toLatLng = (point: Point): L.LatLngTuple => [point.lat, point.lon];

export const popupHtml = (point: Placed, detail: string, address = ''): string => `
  <p class="text-sm font-bold text-stone-900">${point.name}</p>
  <p class="mt-0.5 text-xs text-stone-500">${detail}</p>
  <a href="${directionsUrlTo(point)}" target="_blank" rel="noopener noreferrer"
     class="mt-2 block text-xs font-medium text-brand-700 underline underline-offset-4">
    Googleマップで経路を見る ↗
  </a>
  <a href="${placeSearchUrl(point.name, address)}" target="_blank" rel="noopener noreferrer"
     class="mt-1 block text-xs font-medium text-brand-700 underline underline-offset-4">
    営業時間や口コミを見る ↗
  </a>`;

/** 頭の円の中心が (14,13)、先端が (14,35) の水滴形 */
const PIN_SHAPE = 'M14 1c-6.6 0-12 5.4-12 12 0 8.6 12 22 12 22s12-13.4 12-22c0-6.6-5.4-12-12-12Z';

/** 色は text-* クラスで渡し、.park-pin-body が currentColor で塗る */
const pinIcon = (colorClass: string, glyph: GlyphId, width: number): L.DivIcon => {
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
    html: `<span class="park-pin ${colorClass}">${svg}</span>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  });
};

export const pin = (point: Placed, colorClass: string, glyph: GlyphId, width: number): L.Marker =>
  L.marker(toLatLng(point), { icon: pinIcon(colorClass, glyph, width), title: point.name });

/**
 * 写真タイルの上では細い線が背景に負ける。白の縁取りを下に重ねて浮かせる。
 * 破線は徒歩圏の目安に使っているので、選んだ線は実線にして役割を分ける。
 */
export const casedLine = (path: L.LatLngTuple[], weight = 4): L.LayerGroup =>
  L.layerGroup([
    L.polyline(path, {
      color: cssColor(MAP_COLOR_VAR.markerEdge),
      weight: weight + 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    L.polyline(path, {
      color: cssColor(MAP_COLOR_VAR.route),
      weight,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  ]);

export const walkRing = (center: Point, meters: number): L.Circle =>
  L.circle(toLatLng(center), {
    radius: meters,
    color: cssColor(MAP_COLOR_VAR.ring),
    weight: 3,
    opacity: 0.85,
    dashArray: '8 9',
    fillColor: cssColor(MAP_COLOR_VAR.ring),
    fillOpacity: 0.04,
  });
