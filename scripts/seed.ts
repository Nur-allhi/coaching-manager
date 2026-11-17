/**
 * CLI for T-044: `pnpm seed --students 5000 [--seed 1] [--out test-results/seeded-students.json]`.
 * Writes a deterministic JSON dataset under the ignored `test-results/` by default. Runs under
 * Node 24's built-in TypeScript type stripping; no loader or new dependency is needed.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { generateStudents } from './seed-data.ts'

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0) return fallback
  const value = process.argv[index + 1]
  if (value === undefined || value.startsWith('--')) {
    console.error(`--${name} needs a value`)
    process.exit(1)
  }
  return value
}

const count = Number(option('students', '5000'))
const seed = Number(option('seed', '1'))
const out = option('out', 'test-results/seeded-students.json')

if (!Number.isSafeInteger(count) || count < 1) {
  console.error('--students must be a positive whole number')
  process.exit(1)
}
if (!Number.isSafeInteger(seed)) {
  console.error('--seed must be a whole number')
  process.exit(1)
}

const students = generateStudents(count, seed)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(students))
console.log(`Generated ${students.length} students (seed ${seed}) at ${out}`)
