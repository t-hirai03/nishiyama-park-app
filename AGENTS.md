# 西山公園アプリ（オープンデータ活用アプリコンテスト2026 応募作品）

福井県鯖江市「西山公園」を題材にしたWebアプリ。

## コンテストの前提

- **テーマ: 「西山公園を福井県を代表する観光地にするアプリ」**
- 主催: 鯖江市 / 企画運営: NPO法人エル・コミュニティ
- 提出期限: **2026/9/30 11:00**（応募は1人1作品。複数案の同時応募は不可）
- 予選審査 → 通過者は鯖江市での審査会に招待され、**本人がプレゼン**して最優秀作品を決定
- 審査会: 2026/11/28(土) 道の駅 西山公園
- **審査基準: アイデアの独自性 / データ活用度 / デザイン性**
- 年齢制限なし。個人・チームどちらも可

主催者が投げかけている問いは2つ。設計判断で迷ったらここに戻る。

> そんなたくさんの魅力が詰まっている西山公園を、福井県を代表する観光地にするには？
> **県外の人からも「遊びに行きたい！」と思ってもらえるには？**

西山公園は「日本の歴史公園100選」選定。レッサーパンダに会える**無料の**動物園を併設。

### 注意すべきズレ

「県外の人に来てほしい」がテーマだが、**手持ちの来訪者データは上位8市町村がすべて福井県内**
（休日は鯖江市52%、平日62%）。県外客のデータは1件も存在しない。
県外向けを主張するなら、県内客の実績から導いた根拠であることを明示すること。

## データ

- 手持ちの変換済みデータは `src/data/`、元ファイルは `data/raw/`（`npm run build:data` で変換）
- **鯖江市オープンデータの調査結果は `data/catalog/README.md` に集約**。
  取得方法・採用/不採用の理由・座標の実測値まで記録済み。データを探す前にここを読む
- 鯖江市はCKANに組織として未登録のため `organization_list` からは辿れない（詳細は上記）
- ライセンスは確認した範囲ですべて CC BY 2.1。出典表記が必要
- CSVは **UTF-8 と Shift_JIS が混在**している

## 現在の状況（2026-09-17 時点）

- PR #1 は **main にマージ済み**（`a3a24c2`）。採点アプリ一式が main の基準線。
  `npx tsc --noEmit` と `npx astro build` の通過を確認済み
- `src/lib`（約1,100行）が見頃・混雑・気温・天気の採点ロジック。**流用が前提。捨てない**
- `/data`（データ解説ページ）は削除した。出典表記はトップのフッターに集約
- 画面から到達しないファイルが4件ある。消していないので流用できる:
  `VisitPlanner.tsx`(352行) / `narrative.ts`(135行) / `ColumnChart.astro` / `BarList.astro`
- `claim.ts` と `url-state.ts` は画面では未使用だが `npm run check:claim` / `check:url` が参照している
- アクセス（駅・バス停・園内トイレ）は `npm run build:geo` で変換済み。
  実測値と注意点は `data/catalog/README.md` の「取得済み・変換済み」を読む

### 実測値（季節は気象庁式 春3-5/夏6-8/秋9-11/冬12-2）

数値は `npm run check:claim` で再現できる。手で書き換えないこと。

| | 春 | 夏 | 秋 | 冬 |
| --- | --- | --- | --- | --- |
| ピーク | 5/5 = 4,550人 | 730人 | 11/16 = 1,310人 | 580人 |
| 中央値 | 450人 | 330人 | 300人 | 220人 |
| 快適日(15〜25℃かつ晴/曇) | 39/92日 | **3/92日** | 30/91日 | 13/90日 |
| 動物園18年トレンド | **+6%** | — | **+64%** | — |

紅葉の見頃 × 平日 × 晴/曇 の13日間は中央値 **350人**。5/5 の **13分の1**。
（これは季節全体ではなく見頃ウィンドウでの測定値）

**快適日が最も多いのは春の39日で、秋は30日で2位。** 「秋が年間最多」は
春を4〜5月に限定したときだけ成り立つ数字で、境界の取り方に依存する。

**ツツジを否定しないこと。** 主催は鯖江市でPRの中心はツツジ。ここを外すと心証を損ねる。

### 既定では春が1位になる。これはバグではない

見頃の配点が40点あり、春は桜とツツジで2回ピークが来るため、既定条件では
構造上こうなる。秋が1位になるのは「県外から」「空いている日がいい」と
入力したときだけ。

```
県内・優先度50        春82  秋77  冬45  夏44
県外鉄道・優先度50     春73  秋70  冬50  夏49
県外鉄道・優先度65     秋65  春64  冬57  夏56  ← ここで逆転
```

**重みを調整して秋を1位にしないこと。** 結論に合わせて計算を歪めることになる。

### 未着手・要確認

- **福井鉄道西山公園駅の座標をどう扱うか。** 公園の最寄り駅（市の案内で徒歩1分）だが
  鯖江市オープンデータに収録が無く、地図にピンを置けていない。地理院タイル上には描かれている。
  国土数値情報（国土交通省 N02 鉄道）等の外部データを足すか、データに無い旨の明示で通すかの判断が残る
- イベントCSV 685件に西山公園開催分があるか（取得は可能。`data/raw` に未保存）
- `市営駐車場情報`・`西山動物園の動物` のXMLは**取得できない**。カタログのURLが
  HTTPSへリダイレクトされるが `www3.city.sabae.fukui.jp` の証明書がホスト名と一致せず
  検証が通らない。給餌時間・駐車場満空は当てにしない

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
