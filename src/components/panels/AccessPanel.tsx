import {
  BUS_STOPS,
  GEO_SOURCE,
  ORIGIN_STATIONS,
  PARK_ROUTES,
  PARK_TOILETS,
  directionsUrlBetween,
  spotKey,
  TRAVEL_MODES,
} from '../../lib/geo';
import type { Anchor, Placed, TravelMode } from '../../types/geo';
import { ExternalLink } from '../ui/ExternalLink';
import { ToggleChip } from '../ui/ToggleChip';
import { PanelHead } from './PanelHead';

const BARRIER_FREE = PARK_TOILETS.filter((toilet) => toilet.barrierFree).length;

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
      title="西山公園へのアクセス情報"
      lead="駅を選ぶと、西山公園までの直線距離と徒歩時間を出します。"
      onClose={onClose}
    />

    <p className="mt-4 text-xs font-bold text-stone-900">どの駅から</p>
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
          駅を選ぶと、西山公園までの距離を出します。
        </p>
      )}
    </div>

    <p className="mt-4 text-xs leading-relaxed text-stone-500">
      最寄りの
      <strong className="font-semibold text-stone-700">西山公園駅は出発地の選択肢にありません</strong>
      。手元のオープンデータに鉄道駅そのものの座標が無いためです。鯖江市は同駅から徒歩1分と案内しています。
    </p>
    <p className="mt-3 text-xs leading-relaxed text-stone-500">
      公園に直接停まるのは{PARK_ROUTES.join('・')}のみです（バス停{BUS_STOPS.length}
      件の路線名から集計）。園内には誰でも使えるトイレが{PARK_TOILETS.length}箇所あり、うち
      {BARRIER_FREE}箇所がバリアフリー対応です。
    </p>
    <p className="mt-3 text-xs leading-relaxed text-stone-400">{GEO_SOURCE.note}</p>
  </>
);
