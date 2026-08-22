// data/raw/images/ の原本画像を WebP へ変換して src/assets/ に出力する。
// 原本はオープンデータの取得物そのままなので git 管理外。変換後のみリポジトリで管理する。
import { readdir, mkdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const SRC = 'data/raw/images'
const OUT = 'src/assets/images/tsutsuji'
const MAX_EDGE = 2400
const QUALITY = 82

await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()

for (const file of files) {
  const from = join(SRC, file)
  const to = join(OUT, `${basename(file, extname(file))}.webp`)

  const image = sharp(from)
  const { width, height } = await image.metadata()

  await image
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(to)

  const before = (await stat(from)).size
  const after = (await stat(to)).size
  const pct = ((1 - after / before) * 100).toFixed(1)

  console.log(
    `${file} ${width}x${height} ${(before / 1024 / 1024).toFixed(2)}MB` +
      ` -> ${basename(to)} ${(after / 1024).toFixed(0)}KB (-${pct}%)`
  )
}

console.log(`\n${files.length} images converted.`)
