import accessData from '../data/access.json';
import spotsData from '../data/spots.json';

export interface Point {
  readonly lat: number;
  readonly lon: number;
}

/** 名前のある地点。距離が未計算のもの（現在地・地図で指した点）も含む */
export interface Anchor extends Point {
  readonly name: string;
}

export interface Placed extends Anchor {
  readonly distanceM: number;
  readonly walkMinutes: number;
}

export interface Station extends Placed {
  readonly via: readonly string[];
}

export interface BusStop extends Placed {
  readonly routes: readonly string[];
}

export interface Toilet extends Placed {
  readonly inPark: boolean;
  readonly male: number;
  readonly female: number;
  readonly unisex: number;
  readonly barrierFree: boolean;
}

export interface Spot extends Placed {
  readonly category: string;
  readonly genres: readonly string[];
  readonly description: string;
  readonly homepage: string;
  readonly address: string;
}

export const PARK: Point & { name: string } = accessData.park;
export const STATIONS = accessData.stations as readonly Station[];
export const BUS_STOPS = accessData.busStops as readonly BusStop[];
export const TOILETS = spotsData.toilets as readonly Toilet[];
export const SPOTS = spotsData.spots as readonly Spot[];
export const GEO_SOURCE = accessData.source;

/** 公園に直接停まる路線。実測60〜160mのバス停から拾う */
export const PARK_ROUTES: readonly string[] = [
  ...new Set(BUS_STOPS.filter((stop) => stop.distanceM <= 200).flatMap((stop) => stop.routes)),
];

/**
 * 公園を原点とした正距円筒図法。緯度1度あたりの経度距離は cos(lat) 倍になるため、
 * 東西方向だけ縮めないと園内200m程度の図で形が崩れる。
 */
export const project = (point: Point, metersPerUnit: number) => {
  const latM = 111_320;
  const lonM = latM * Math.cos((PARK.lat * Math.PI) / 180);
  return {
    x: ((point.lon - PARK.lon) * lonM) / metersPerUnit,
    y: -((point.lat - PARK.lat) * latM) / metersPerUnit,
  };
};

/**
 * 「西山公園（東）」「西山公園（西）」のように同じ停留所が進行方向で分かれている。
 * 図の上では1点に見せたいので、方向の接尾辞を落として最寄りだけ残す。
 */
export const groupBusStops = (stops: readonly BusStop[]): BusStop[] => {
  const byBaseName = new Map<string, BusStop>();
  for (const stop of stops) {
    const name = stop.name.replace(/（[東西南北]）$/, '');
    const current = byBaseName.get(name);
    if (!current || stop.distanceM < current.distanceM) {
      byBaseName.set(name, { ...stop, name, routes: stop.routes });
    }
  }
  return [...byBaseName.values()].sort((a, b) => a.distanceM - b.distanceM);
};

/** 観光データの「ジャンル」列をそのまま使う。空欄はカテゴリ名で代用する */
export const GENRE_ORDER = ['観る', '食べる', '買う', '遊ぶ'] as const;
export type Genre = (typeof GENRE_ORDER)[number];

/**
 * 色の値は src/styles/global.css の CSS 変数だけが持つ。ここは変数名を指すだけにして、
 * 2箇所に同じカラーコードを置かない。解決は描画時に cssColor() で行う。
 */
export const GENRE_COLOR_VAR: Record<Genre, string> = {
  観る: '--color-spot-see',
  食べる: '--color-spot-eat',
  買う: '--color-spot-buy',
  遊ぶ: '--color-spot-play',
};

export const MAP_COLOR_VAR = {
  park: '--color-brand-700',
  station: '--color-transit-station',
  busStop: '--color-transit-bus',
  toilet: '--color-toilet',
  ring: '--color-brand-600',
  route: '--color-brand-600',
  custom: '--color-brand-900',
  markerEdge: '--color-marker-edge',
  markerOff: '--color-marker-off',
} as const;

/** CSS変数を実際の色に解決する。DOMが必要なのでクライアント側でしか呼べない */
export const cssColor = (variable: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(variable).trim();

export const primaryGenre = (spot: Spot): Genre | undefined =>
  GENRE_ORDER.find((genre) => spot.genres.includes(genre));

/** 西山公園そのもの（0m）は寄り道先ではないので外す */
export const NEARBY_SPOTS = SPOTS.filter((spot) => spot.distanceM > 0);

export const spotsByGenre = (): { genre: Genre; spots: Spot[] }[] =>
  GENRE_ORDER.map((genre) => ({
    genre,
    spots: NEARBY_SPOTS.filter((spot) => primaryGenre(spot) === genre),
  })).filter((group) => group.spots.length > 0);

/** 2点間の直線距離(m)。build-geo.mjs と同じ式。経路距離ではない */
export const haversineM = (a: Point, b: Point): number => {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 不動産公取協と同じ 80m=1分・切り上げ。直線距離からの換算なので実経路より短く出る */
export const walkMinutesOf = (meters: number): number => Math.ceil(meters / 80);

/** 公園を出て順に回り、公園へ戻る距離の合計 */
export const roundTripM = (stops: readonly Point[]): number => {
  if (stops.length === 0) return 0;
  const path = [PARK, ...stops, PARK];
  return path
    .slice(1)
    .reduce((sum, point, index) => sum + haversineM(path[index] as Point, point), 0);
};

/** Googleマップの経路URL。waypointsは9件までなので呼び出し側で絞る */
export const routeUrl = (stops: readonly Placed[]): string => {
  const origin = `${PARK.lat},${PARK.lon}`;
  const waypoints = stops.map((stop) => `${stop.lat},${stop.lon}`).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${encodeURIComponent(waypoints)}&travelmode=walking`;
};

export const spotKey = (point: Anchor): string => `${point.name}@${point.lat},${point.lon}`;

/**
 * 園内の目的地。座標は公共トイレデータから取っている。
 * 中央広場・冒険の森・嚮陽庭園などは園内の地点名そのものなので、
 * トイレの位置がそのまま園内のランドマークの座標として使える。
 */
export const PARK_PLACES: readonly Anchor[] = [
  { name: '公園の中心', lat: PARK.lat, lon: PARK.lon },
  ...TOILETS.map((toilet) => ({ name: toilet.name, lat: toilet.lat, lon: toilet.lon })),
];

export const TRAVEL_MODES = [
  { id: 'walking', label: '徒歩' },
  { id: 'bicycling', label: '自転車' },
  { id: 'transit', label: '公共交通' },
  { id: 'driving', label: '車' },
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number]['id'];

/** 2地点の経路をGoogleマップに渡す */
export const directionsUrlBetween = (
  from: Point,
  to: Point,
  mode: TravelMode = 'walking'
): string =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${mode}`;
