import { STATIONS } from '../../lib/geo';
import { ExternalLink } from '../ui/ExternalLink';
import { PanelHead } from './PanelHead';

const SABAE_STATION_M = STATIONS.find((station) => station.name === '鯖江駅')?.distanceM;

interface SourcesPanelProps {
  readonly onClose: () => void;
}

export const SourcesPanel = ({ onClose }: SourcesPanelProps) => (
  <>
    <PanelHead
      title="データの出典と注意点"
      lead="この画面の数字と位置は、すべて公開されているデータから出しています。"
      onClose={onClose}
    />
    <p className="mt-4 text-xs leading-relaxed text-stone-500">
      出典: 鯖江市オープンデータ（日別来訪者数・観光・公共トイレ・バス停 / CC BY 2.1） /
      天気予報は Open-Meteo / 地図は{' '}
      <ExternalLink href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</ExternalLink>
      （国土地理院）。
    </p>
    <p className="mt-3 text-xs leading-relaxed text-stone-500">
      予想人出は過去実績にもとづく推計値、距離は公開座標からの直線距離です。実際の混雑や徒歩時間を保証するものではありません。
    </p>
    <p className="mt-3 text-xs leading-relaxed text-stone-500">
      徒歩1分・約15分は{' '}
      <ExternalLink href="https://www.city.sabae.fukui.jp/kurashi_tetsuduki/doro_kasen_koen/koen/nishiyama/nishiyama_kotsu.html">
        鯖江市「西山公園 交通のご案内」
      </ExternalLink>
      の記載です。JR鯖江駅までの距離は市の案内が約1.2km、公開座標からの実測が
      {SABAE_STATION_M?.toLocaleString()}
      mで一致しません。駅舎のどこを起点にするかで差が出ます。
    </p>
    <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-400">
      オープンデータ活用アプリコンテスト2026 応募作品（主催: 鯖江市 / 企画運営:
      NPO法人エル・コミュニティ）
    </p>
  </>
);
