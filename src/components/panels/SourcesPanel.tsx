import type { ReactNode } from 'react';
import { STATIONS } from '../../lib/geo';
import { ExternalLink } from '../ui/ExternalLink';

const SABAE_STATION_M = STATIONS.find((station) => station.name === '鯖江駅')?.distanceM;

const SOURCES: readonly {
  readonly use: string;
  readonly name: string;
  readonly href: string;
  readonly note: string;
}[] = [
  {
    use: '人出・見頃・周辺スポット・トイレ・バス停',
    name: '鯖江市オープンデータ',
    href: 'https://data.city.sabae.lg.jp/',
    note: '日別来訪者数・観光・公共トイレ・バス停 / CC BY 2.1',
  },
  {
    use: '天気予報',
    name: 'Open-Meteo',
    href: 'https://open-meteo.com/',
    note: '',
  },
  {
    use: '地図',
    name: '地理院タイル（国土地理院）',
    href: 'https://maps.gsi.go.jp/development/ichiran.html',
    note: '',
  },
];

interface CardProps {
  readonly title: string;
  readonly children: ReactNode;
}

const Card = ({ title, children }: CardProps) => (
  <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
    <h3 className="text-sm font-bold text-brand-800">{title}</h3>
    {children}
  </section>
);

export const SourcesPanel = () => (
  <div className="mx-auto w-[min(56rem,100%)]">
    <h2 className="text-2xl font-bold tracking-tight text-stone-900">データの出典と注意点</h2>
    <p className="mt-3 text-sm leading-relaxed text-stone-600">
      この画面の数字と位置は、すべて公開されているデータから出しています。
    </p>

    <Card title="出典">
      <dl className="mt-3 divide-y divide-stone-200 text-sm">
        {SOURCES.map((source) => (
          <div key={source.name} className="grid gap-1 py-3 sm:grid-cols-[18rem_1fr] sm:gap-6">
            <dt className="text-stone-500">{source.use}</dt>
            <dd className="text-stone-900">
              <ExternalLink href={source.href}>{source.name}</ExternalLink>
              {source.note && (
                <span className="mt-0.5 block text-xs text-stone-500">{source.note}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>

    <Card title="数字の扱い">
      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        予想人出は過去実績にもとづく推計値、距離は公開座標からの直線距離です。実際の混雑や徒歩時間を保証するものではありません。
      </p>
      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        徒歩1分・約15分は{' '}
        <ExternalLink href="https://www.city.sabae.fukui.jp/kurashi_tetsuduki/doro_kasen_koen/koen/nishiyama/nishiyama_kotsu.html">
          鯖江市「西山公園 交通のご案内」
        </ExternalLink>
        の記載です。鯖江駅までの距離は市の案内が約1.2km、公開座標からの実測が
        {SABAE_STATION_M?.toLocaleString()}
        mで一致しません。駅舎のどこを起点にするかで差が出ます。
      </p>
      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        寄り道の名前順は、観光データに名称の読みが無いため、漢字で始まる名前は読み順に並びません。
      </p>
    </Card>

    <p className="mt-8 text-xs leading-relaxed text-stone-500">
      オープンデータ活用アプリコンテスト2026 応募作品（主催: 鯖江市 / 企画運営:
      NPO法人エル・コミュニティ）
    </p>
  </div>
);
