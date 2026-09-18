import accessData from '../data/access.json';
import spotsData from '../data/spots.json';
import type { Option } from '../types/common';
import type {
  Anchor,
  BusStop,
  Genre,
  Placed,
  Point,
  Spot,
  Station,
  Toilet,
  TravelMode,
} from '../types/geo';

export const PARK: Anchor = accessData.park;
export const STATIONS: readonly Station[] = accessData.stations;
export const BUS_STOPS: readonly BusStop[] = accessData.busStops;
export const TOILETS: readonly Toilet[] = spotsData.toilets;
export const SPOTS: readonly Spot[] = spotsData.spots;
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
export const GENRE_ORDER: readonly Genre[] = ['観る', '食べる', '買う', '遊ぶ'];

export const primaryGenre = (spot: Spot): Genre | undefined =>
  GENRE_ORDER.find((genre) => spot.genres.includes(genre));

/** 西山公園そのもの（0m）は寄り道先ではないので外す */
export const NEARBY_SPOTS = SPOTS.filter((spot) => spot.distanceM > 0);

/** 周辺スポットが1件以上あるジャンル。地図の凡例と一覧の絞り込みに出す */
export const PRESENT_GENRES: readonly Genre[] = GENRE_ORDER.filter((genre) =>
  NEARBY_SPOTS.some((spot) => primaryGenre(spot) === genre)
);

/** 徒歩圏の駅。実測では西鯖江駅6分・鯖江駅12分の2件になる */
export const ORIGIN_STATIONS: readonly Station[] = STATIONS.filter(
  (station) => station.walkMinutes <= 15
);

export const PARK_TOILETS: readonly Toilet[] = TOILETS.filter((toilet) => toilet.inPark);

/** 地図に置く公園のピン。距離は自分自身なので0 */
export const PARK_PLACE: Placed = { ...PARK, distanceM: 0, walkMinutes: 0 };

export const spotsByGenre = (): { genre: Genre; spots: Spot[] }[] =>
  GENRE_ORDER.map((genre) => ({
    genre,
    spots: NEARBY_SPOTS.filter((spot) => primaryGenre(spot) === genre),
  })).filter((group) => group.spots.length > 0);

export const spotKey = (point: Anchor): string => `${point.name}@${point.lat},${point.lon}`;

export const TRAVEL_MODES: readonly Option<TravelMode>[] = [
  { id: 'walking', label: '徒歩' },
  { id: 'bicycling', label: '自転車' },
  { id: 'transit', label: '公共交通' },
  { id: 'driving', label: '車' },
];

/** 出発地を空けておくと、Googleマップが閲覧者の現在地を補う */
export const directionsUrlTo = (to: Point, mode: TravelMode = 'walking'): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}&travelmode=${mode}`;

/** 2地点の経路をGoogleマップに渡す */
export const directionsUrlBetween = (
  from: Point,
  to: Point,
  mode: TravelMode = 'walking'
): string =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${mode}`;

/** 店舗情報をGoogleマップで引く。名前だけだと同名に当たるので住所を添える */
export const placeSearchUrl = (name: string, address: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`.trim())}`;
