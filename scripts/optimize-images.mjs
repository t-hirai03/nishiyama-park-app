// data/raw/images/<カテゴリ>/ の原本画像を WebP へ変換し src/assets/images/<カテゴリ>/ へ出力する。
// 原本はオープンデータの取得物そのままなので git 管理外。変換後のみリポジトリで管理する。
import { readdir, mkdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const SRC = 'data/raw/images'
const OUT = 'src/assets/images'
const MAX_EDGE = 2400
const QUALITY = 82

const categories = (await readdir(SRC, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

let total = 0

for (const category of categories) {
  await mkdir(join(OUT, category), { recursive: true })

  const files = (await readdir(join(SRC, category)))
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()

  console.log(`\n[${category}] ${files.length} files`)

  for (const file of files) {
    const from = join(SRC, category, file)
    const to = join(OUT, category, `${basename(file, extname(file))}.webp`)

    const image = sharp(from)
    const { width, height } = await image.metadata()

    await image
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(to)

    const before = (await stat(from)).size
    const after = (await stat(to)).size

    console.log(
      `  ${file} ${width}x${height} ${(before / 1024 / 1024).toFixed(2)}MB` +
        ` -> ${basename(to)} ${(after / 1024).toFixed(0)}KB` +
        ` (-${((1 - after / before) * 100).toFixed(1)}%)`
    )
    total++
  }
}

console.log(`\n${total} images converted into ${categories.length} categories.`)
