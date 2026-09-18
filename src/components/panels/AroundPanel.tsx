import { useMemo } from 'react';
import { GENRE_CLASS } from '../../constants/colors';
import { GENRE_GLYPH } from '../../constants/glyphs';
import { NEARBY_SPOTS, PRESENT_GENRES, primaryGenre, spotKey } from '../../lib/geo';
import type { Option } from '../../types/common';
import type { Genre, Spot } from '../../types/geo';
import type { SortKey } from '../../types/ui';
import { ExternalLink } from '../ui/ExternalLink';
import { LineIcon } from '../ui/LineIcon';
import { SpotIcon } from '../ui/SpotIcon';
import { ToggleChip } from '../ui/ToggleChip';
import { NextStep } from './NextStep';
import { PanelHead } from './PanelHead';

const SORTS: readonly Option<SortKey>[] = [
  { id: 'name', label: '名前順' },
  { id: 'distance', label: '近い順' },
];

/**
 * 観光データに名称の読み（かな）が無いため、漢字の名前は読み順にならない。
 * かな始まりの20件は期待どおり並び、漢字始まりの29件はUnicodeの順になる。
 */
const JA_COLLATOR = new Intl.Collator('ja');

const LINKED_SPOTS = NEARBY_SPOTS.filter((spot) => spot.homepage).length;

const sortSpots = (spots: readonly Spot[], key: SortKey): readonly Spot[] =>
  key === 'distance'
    ? [...spots].sort((a, b) => a.distanceM - b.distanceM)
    : [...spots].sort((a, b) => JA_COLLATOR.compare(a.name, b.name));

interface SpotRowProps {
  readonly spot: Spot;
  readonly onFocus: () => void;
}

const SpotRow = ({ spot, onFocus }: SpotRowProps) => {
  const genre = primaryGenre(spot);
  return (
    <li className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-2 transition duration-150 hover:bg-brand-50">
      <button
        type="button"
        onClick={onFocus}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        {genre && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${GENRE_CLASS[genre].tint}`}
          >
            <SpotIcon glyph={GENRE_GLYPH[genre]} className={`h-4 w-4 ${GENRE_CLASS[genre].text}`} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-stone-900">{spot.name}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-400">
            {spot.category}・徒歩{spot.walkMinutes}分（{spot.distanceM}m）
          </span>
        </span>
      </button>
      {spot.homepage && (
        <ExternalLink
          href={spot.homepage}
          className="shrink-0 rounded-full p-1.5 text-stone-400 transition duration-150 hover:bg-white hover:text-brand-700"
          label={`${spot.name}のサイトを開く`}
          title="サイトを開く"
        >
          <LineIcon icon="external" className="h-4 w-4" />
        </ExternalLink>
      )}
    </li>
  );
};

interface AroundPanelProps {
  readonly genres: ReadonlySet<Genre>;
  readonly onToggleGenre: (genre: Genre) => void;
  readonly sortKey: SortKey;
  readonly onSort: (key: SortKey) => void;
  readonly onFocus: (spot: Spot) => void;
  readonly onNext: () => void;
  readonly onClose: () => void;
}

export const AroundPanel = ({
  genres,
  onToggleGenre,
  sortKey,
  onSort,
  onFocus,
  onNext,
  onClose,
}: AroundPanelProps) => {
  const visibleSpots = useMemo(
    () =>
      sortSpots(
        NEARBY_SPOTS.filter((spot) => {
          const genre = primaryGenre(spot);
          return genre ? genres.has(genre) : false;
        }),
        sortKey
      ),
    [genres, sortKey]
  );

  return (
    <>
      <PanelHead
        title="公園を出てから、どこへ寄れるか"
        lead={`鯖江市の観光データから半径900m以内のスポット${NEARBY_SPOTS.length}件。名前を押すと地図が寄り、ピンのポップアップから経路や店舗情報に飛べます。名前順は、データに読みが無いため漢字の名前は読み順になりません。`}
        onClose={onClose}
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PRESENT_GENRES.map((genre) => (
          <ToggleChip
            key={genre}
            on={genres.has(genre)}
            label={genre}
            onClick={() => onToggleGenre(genre)}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          {visibleSpots.length === NEARBY_SPOTS.length
            ? `${NEARBY_SPOTS.length}件`
            : `${NEARBY_SPOTS.length}件のうち${visibleSpots.length}件`}
        </p>
        <div className="flex gap-1">
          {SORTS.map((sort) => (
            <ToggleChip
              key={sort.id}
              on={sortKey === sort.id}
              label={sort.label}
              onClick={() => onSort(sort.id)}
            />
          ))}
        </div>
      </div>
      <ul className="mt-1">
        {visibleSpots.map((spot) => (
          <SpotRow key={spotKey(spot)} spot={spot} onFocus={() => onFocus(spot)} />
        ))}
      </ul>
      {visibleSpots.length === 0 && (
        <p className="mt-4 text-xs text-stone-500">
          ジャンルがすべて外れています。上のチップから選び直してください。
        </p>
      )}
      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        右上のアイコンはデータセットに収録されたURLへのリンクです（{LINKED_SPOTS}/
        {NEARBY_SPOTS.length}件）。収録時点のURLなので、現在は繋がらない場合があります。
        営業時間や口コミは、ピンを押して出るGoogleマップのリンクから確認できます。
      </p>
      <NextStep label="行き方を調べる" onClick={onNext} />
    </>
  );
};
