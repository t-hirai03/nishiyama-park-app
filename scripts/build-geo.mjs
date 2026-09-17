import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'data/raw';
const OUT = 'src/data';

const PARK = { name: '西山公園', lat: 35.950627, lon: 136.182606 };
const NEARBY_RADIUS_M = 900;

/** 引用符つき・改行を含むフィールドに対応した最小限のCSVパーサ */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

const readTable = (file, encoding) => {
  const text = new TextDecoder(encoding).decode(readFileSync(join(RAW, file))).replace(/^﻿/, '');
  const [header, ...rows] = parseCsv(text);
  const indexOf = (name) => header.indexOf(name);
  return rows.map((cells) => ({
    cells,
    get: (name) => cells[indexOf(name)] ?? '',
    all: (name) =>
      header.flatMap((h, i) => (h === name && cells[i] ? [cells[i]] : [])),
  }));
};

const distanceM = (a, b) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 不動産公取協と同じ 80m=1分・端数切り上げ。直線距離からの換算なので実経路より短く出る */
const walkMinutes = (meters) => Math.ceil(meters / 80);

const withDistance = (entry) => {
  const meters = Math.round(distanceM(PARK, entry));
  return { ...entry, distanceM: meters, walkMinutes: walkMinutes(meters) };
};

const coords = (row) => {
  const lat = Number(row.get('緯度'));
  const lon = Number(row.get('経度'));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
};

/** 園内の施設に加え、公園に隣接し誰でも使える2施設を含める */
const ADJACENT_TOILETS = ['道の駅西山公園', '嚮陽会館'];

const buildToilets = () =>
  readTable('sabae-toilet.csv', 'shift_jis')
    .filter((row) => {
      const name = row.get('施設名');
      return name.startsWith('西山公園') || ADJACENT_TOILETS.includes(name);
    })
    .map((row) => {
      const point = coords(row);
      const count = (name) => Number(row.get(name)) || 0;
      const name = row.get('施設名');
      return withDistance({
        name: name.replace(/^西山公園\((.+)\)$/, '$1'),
        inPark: name.startsWith('西山公園'),
        ...point,
        male: count('男性トイレ数'),
        female: count('女性トイレ数'),
        unisex: count('男女共用トイレ数'),
        barrierFree: count('バリアフリートイレ数') > 0,
      });
    })
    .sort((a, b) => a.distanceM - b.distanceM);

const buildSpots = () => {
  const seen = new Set();
  return readTable('sabae-kanko.csv', 'utf-8')
    .map((row) => {
      const point = coords(row);
      if (!point) return null;
      const key = `${row.get('名称')}@${point.lat},${point.lon}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const entry = withDistance({
        name: row.get('名称'),
        category: row.get('カテゴリ補足') || row.get('カテゴリ'),
        genres: row.all('ジャンル'),
        address: row.get('住所'),
        description: row.get('説明(日本語)'),
        opens: row.get('開所時刻'),
        closes: row.get('閉所時刻'),
        closedOn: row.get('定休日'),
        homepage: row.get('ホームページアドレス'),
        ...point,
      });
      return entry.distanceM <= NEARBY_RADIUS_M ? entry : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceM - b.distanceM);
};

const buildBusStops = () => {
  const byName = new Map();
  for (const row of readTable('sabae-busstop-763.csv', 'shift_jis')) {
    const point = coords(row);
    const name = row.get('バス停名称');
    if (!point || !name) continue;
    const entry = byName.get(name) ?? { name, ...point, routes: [] };
    const route = row.get('路線名');
    if (route && !entry.routes.includes(route)) entry.routes.push(route);
    byName.set(name, entry);
  }
  return [...byName.values()]
    .map(withDistance)
    .filter((stop) => stop.distanceM <= NEARBY_RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM);
};

/**
 * 駅そのものの座標は公開データに無いため、駅前バス停の実測座標で代表させる。
 * この方法では駅前バス停を持たない駅が落ちる。実際に福井鉄道西山公園駅（公園の最寄り）が
 * 漏れている。鯖江市の案内では同駅から徒歩1分。
 */
const STATION_STOPS = [
  { station: '西鯖江駅', stops: ['西鯖江駅前（北）', '西鯖江駅前（南）'] },
  { station: '鯖江駅', stops: ['JR鯖江駅（１番のりば）', 'JR鯖江駅（２番のりば）', 'ＪＲ鯖江駅東口'] },
  { station: '北鯖江駅', stops: ['ＪＲ北鯖江駅西口', 'JR北鯖江駅東口'] },
  { station: '神明駅', stops: ['神明駅'] },
];

const buildStations = () => {
  const points = new Map(
    readTable('sabae-busstop-936.csv', 'shift_jis').flatMap((row) => {
      const point = coords(row);
      return point ? [[row.get('バス停名称'), point]] : [];
    })
  );
  return STATION_STOPS.map(({ station, stops }) => {
    const found = stops.flatMap((name) => (points.has(name) ? [points.get(name)] : []));
    if (found.length === 0) throw new Error(`駅前バス停が見つからない: ${station}`);
    const nearest = found
      .map((point) => ({ point, meters: distanceM(PARK, point) }))
      .sort((a, b) => a.meters - b.meters)[0];
    return withDistance({ name: station, via: stops, ...nearest.point });
  }).sort((a, b) => a.distanceM - b.distanceM);
};

mkdirSync(OUT, { recursive: true });

const source = {
  license: 'CC BY 2.1',
  attribution: '鯖江市オープンデータ（観光・公共トイレ・バス停）',
  fetchedAt: new Date().toISOString().slice(0, 10),
  note: '距離は公開座標からの直線距離。徒歩分数は80m=1分・切り上げで換算した目安であり、実際の経路とは異なる。',
  omitted: 'おむつ交換台・ベビーチェア・授乳スペースは元データが西山公園の全施設で空欄のため、有無を判定できず出力していない。',
};

const outputs = {
  'access.json': { park: PARK, source, stations: buildStations(), busStops: buildBusStops() },
  'spots.json': { park: PARK, source, radiusM: NEARBY_RADIUS_M, toilets: buildToilets(), spots: buildSpots() },
};

for (const [name, data] of Object.entries(outputs)) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  console.log(`${name}: ${JSON.stringify(data).length.toLocaleString()} bytes`);
}
