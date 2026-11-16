/**
 * Extract the CHANGELOG section for one version, for use as a GitHub release body.
 *
 * Usage: node scripts/changelog-section.mjs <version>
 *   where <version> is "0.1.0" (no leading v). Prints the section heading and everything
 *   under it, up to the next "## [" heading. Exits 1 with no output if the section is absent,
 *   so a mistagged release fails loudly instead of publishing an empty body.
 */
import { readFileSync } from 'node:fs'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: node scripts/changelog-section.mjs <version>  (e.g. 0.1.0)')
  process.exit(2)
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
const lines = changelog.split('\n')
const heading = new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\]`)

const start = lines.findIndex((line) => heading.test(line))
if (start === -1) {
  console.error(`no CHANGELOG section for ${version}`)
  process.exit(1)
}

const end = lines.findIndex(
  (line, index) => index > start && (/^## \[/.test(line) || /^\[[^\]]+\]:/.test(line)),
)
const section = lines
  .slice(start, end === -1 ? undefined : end)
  .join('\n')
  .trim()
process.stdout.write(`${section}\n`)
