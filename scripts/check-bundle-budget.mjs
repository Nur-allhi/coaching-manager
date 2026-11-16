#!/usr/bin/env node
/**
 * Initial-JavaScript budget check (PLAN.md §10).
 *
 * "initial JS under 300 KB gzipped". The initial bundle is what index.html pulls in on the
 * first paint: the entry chunk plus the modulepreload chunks it depends on. Lazy route chunks
 * are not counted, because they are not loaded on first paint.
 *
 * Usage: node scripts/check-bundle-budget.mjs
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIMIT_BYTES = 300 * 1024
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const htmlPath = join(dist, 'index.html')

if (!existsSync(htmlPath)) {
  console.error('dist/index.html not found. Run `pnpm build` first.')
  process.exit(1)
}

const html = readFileSync(htmlPath, 'utf8')

const initialAssets = new Set()
for (const match of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) initialAssets.add(match[1])
for (const match of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)) {
  initialAssets.add(match[1])
}

if (initialAssets.size === 0) {
  console.error('No initial JavaScript found in dist/index.html — did the build produce one?')
  process.exit(1)
}

let total = 0
const rows = []
for (const asset of [...initialAssets].sort()) {
  const file = join(dist, asset.replace(/^\//, ''))
  if (!existsSync(file)) continue
  const gzipped = gzipSync(readFileSync(file)).length
  total += gzipped
  rows.push({ asset: asset.replace(/^\//, ''), gzipped })
}

const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(7) + ' KB'

console.log('Initial JavaScript (gzip):')
for (const row of rows) console.log(`  ${kb(row.gzipped)}  ${row.asset}`)
console.log(`  ${'-'.repeat(9)}`)
console.log(`  ${kb(total)}  total (limit ${(LIMIT_BYTES / 1024).toFixed(0)} KB)`)

if (total > LIMIT_BYTES) {
  console.error(
    `\nBundle budget exceeded by ${((total - LIMIT_BYTES) / 1024).toFixed(1)} KB. ` +
      `Lazy-load the offending chunk, or check whether it is being pulled into the entry.`,
  )
  process.exit(1)
}

console.log('\nWithin budget.')
