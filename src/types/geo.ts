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

export type Genre = '観る' | '食べる' | '買う' | '遊ぶ';

export type TravelMode = 'walking' | 'bicycling' | 'transit' | 'driving';
