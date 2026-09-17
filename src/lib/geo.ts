import accessData from '../data/access.json';
import spotsData from '../data/spots.json';

export interface Point {
  readonly lat: number;
  readonly lon: number;
}

export interface Placed extends Point {
  readonly name: string;
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
 * 地図の色分け。スポットのジャンルは3色、交通は青系にまとめて役割を分けている。
 * 駅とジャンル色が被ると地図上で区別できなくなるため、ここと MAP_COLOR は重複させない。
 */
export const GENRE_COLOR: Record<Genre, string> = {
  観る: '#0f766e',
  食べる: '#ea580c',
  買う: '#7c3aed',
  遊ぶ: '#4d7c0f',
};

export const MAP_COLOR = {
  park: '#15803d',
  station: '#1d4ed8',
  busStop: '#0284c7',
  toilet: '#a8a29e',
  ring: '#047857',
} as const;

export const primaryGenre = (spot: Spot): Genre | undefined =>
  GENRE_ORDER.find((genre) => spot.genres.includes(genre));

/** 西山公園そのもの（0m）は寄り道先ではないので外す */
export const NEARBY_SPOTS = SPOTS.filter((spot) => spot.distanceM > 0);

export const spotsByGenre = (): { genre: Genre; spots: Spot[] }[] =>
  GENRE_ORDER.map((genre) => ({
    genre,
    spots: NEARBY_SPOTS.filter((spot) => primaryGenre(spot) === genre),
  })).filter((group) => group.spots.length > 0);
