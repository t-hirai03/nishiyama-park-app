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

また「行き先を決める手前」を押さえるのがテーマであり、
「行くと決めた後」の行程管理はテーマからずれる。ここは意識的に選ぶこと。

## データ

- 手持ちの変換済みデータは `src/data/`、元ファイルは `data/raw/`（`npm run build:data` で変換）
- **鯖江市オープンデータの調査結果は `data/catalog/README.md` に集約**。
  取得方法・採用/不採用の理由・座標の実測値まで記録済み。データを探す前にここを読む
- 鯖江市はCKANに組織として未登録のため `organization_list` からは辿れない（詳細は上記）
- ライセンスは確認した範囲ですべて CC BY 2.1。出典表記が必要
- CSVは **UTF-8 と Shift_JIS が混在**している

## 現在の状況（2026-09-06 時点）

- **方針は未確定。** 以下の2案で検討中
  - 案A: 既存の採点アプリ（PR #1）を育てる。URL状態の永続化とプランナーの主役化
  - 案B: 案Aの日別採点エンジンに、園内の時間割を組むタイムラインを足す
- PR #1「訪問日を100点で採点するWebアプリ」は OPEN / MERGEABLE のまま。
  間に合わなかった場合の保険なので、**勝手にマージも破棄もしないこと**
- 既存の `src/lib`（約1,100行）は見頃・混雑・気温・天気の採点ロジック。流用前提

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
