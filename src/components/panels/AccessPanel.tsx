import {
  BUS_STOPS,
  GEO_SOURCE,
  ORIGIN_STATIONS,
  PARK_ROUTES,
  PARK_TOILETS,
  directionsUrlBetween,
  spotKey,
  TRAVEL_MODES,
  directionsUrlFromName,
  directionsUrlTo,
} from '../../lib/geo';
import type { Anchor, Placed, TravelMode } from '../../types/geo';
import { ExternalLink } from '../ui/ExternalLink';
import { ToggleChip } from '../ui/ToggleChip';
import { PanelHead } from './PanelHead';

const BARRIER_FREE = PARK_TOILETS.filter((toilet) => toilet.barrierFree).length;

const FAR_ORIGINS = ['東京駅', '名古屋駅', '大阪駅'] as const;

const ROUTE_LINK_CLASS =
  'rounded-full bg-white px-3 py-1.5 text-xs text-stone-700 ring-1 ring-stone-200 transition duration-150 hover:bg-stone-100';

interface AccessPanelProps {
  readonly destination: Anchor;
  readonly from: Placed | null;
  readonly onFrom: (place: Placed) => void;
  readonly mode: TravelMode;
  readonly onMode: (mode: TravelMode) => void;
  readonly onClose: () => void;
}

export const AccessPanel = ({
  destination,
  from,
  onFrom,
  mode,
  onMode,
  onClose,
}: AccessPanelProps) => (
  <>
    <PanelHead
      title="西山公園へのアクセス"
      lead="最寄りは福井鉄道の西山公園駅です。鯖江市の案内では、駅から徒歩1分です。"
      onClose={onClose}
    />

    <p className="mt-4 text-xs font-bold text-stone-900">遠方から</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {FAR_ORIGINS.map((origin) => (
        <ExternalLink
          key={origin}
          href={directionsUrlFromName(origin, destination)}
          className={ROUTE_LINK_CLASS}
        >
          {origin}から ↗
        </ExternalLink>
      ))}
      <ExternalLink href={directionsUrlTo(destination, 'transit')} className={ROUTE_LINK_CLASS}>
        現在地から ↗
      </ExternalLink>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">
      Googleマップで公共交通の経路を開きます。所要時間と乗り換えはGoogleマップの検索結果です。
    </p>

    <p className="mt-6 text-xs font-bold text-stone-900">近くの駅から歩く</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ORIGIN_STATIONS.map((place) => (
        <ToggleChip
          key={spotKey(place)}
          on={from !== null && spotKey(from) === spotKey(place)}
          label={place.name}
          onClick={() => onFrom(place)}
        />
      ))}
    </div>

    <div className="mt-4 rounded-2xl bg-brand-50 p-4">
      {from ? (
        <>
          <p className="text-xs text-stone-500">
            {from.name} → {destination.name}
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
              <ExternalLink
                key={travel.id}
                href={directionsUrlBetween(from, destination, travel.id)}
                onClick={() => onMode(travel.id)}
                className={`rounded-full px-3 py-1.5 text-xs transition duration-150 ${
                  mode === travel.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
                }`}
              >
                {travel.label}で見る ↗
              </ExternalLink>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-stone-500">
          駅を選ぶと、西山公園までの直線距離と徒歩時間を出します。
        </p>
      )}
    </div>

    <p className="mt-4 text-xs leading-relaxed text-stone-500">
      公園に直接停まるのは{PARK_ROUTES.join('・')}のみです（バス停{BUS_STOPS.length}
      件の路線名から集計）。園内には誰でも使えるトイレが{PARK_TOILETS.length}箇所あり、うち
      {BARRIER_FREE}箇所がバリアフリー対応です。
    </p>
    <p className="mt-3 text-xs leading-relaxed text-stone-500">
      {GEO_SOURCE.note}
      西山公園駅は鯖江市オープンデータに座標が無いため、選択肢と地図には出していません。
    </p>
  </>
);
