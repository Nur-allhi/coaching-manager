/**
 * Deterministic student seed data (T-044, D-045 A1/B1). Pure TypeScript: no DOM, no Node APIs,
 * so the CLI, Vitest and Playwright all import the exact same generator. Two runs with the same
 * seed produce byte-identical rows.
 */

/** mulberry32: a tiny, well-distributed 32-bit PRNG seeded by one integer. */
export function prng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = [
  'Rahim',
  'Karim',
  'Amina',
  'Salma',
  'Rahman',
  'Hassan',
  'Fatima',
  'Yusuf',
  'Sadia',
  'Arif',
]
const LAST = [
  'Uddin',
  'Khan',
  'Akter',
  'Begum',
  'Sheikh',
  'Islam',
  'Hossain',
  'Ali',
  'Mia',
  'Chowdhury',
]
const GUARDIAN = ['Abdul', 'Mohammad', 'Shamsun', 'Nur', 'Md.', 'Sultan', 'Rehana', 'Jamal']

export interface SeedStudent {
  student_no: string
  full_name: string
  gender: 'male' | 'female' | 'other'
  dob: string
  phone: string
  guardian_name: string
  guardian_phone: string
  admitted_on: string
  status: 'active' | 'dropped' | 'passed_out'
}

/** Generate `count` students for a given admission year, deterministically from `seed`. */
export function generateStudents(count: number, seed = 1, year = 2026): SeedStudent[] {
  const random = prng(seed)
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T
  const rows: SeedStudent[] = []
  for (let index = 0; index < count; index += 1) {
    const gender = pick(['male', 'female', 'other'] as const)
    const month = 1 + Math.floor(random() * 12)
    const day = 1 + Math.floor(random() * 28)
    const phone = `017${String(10000000 + index).slice(-8)}`
    rows.push({
      student_no: `${year}-${String(index + 1).padStart(4, '0')}`,
      full_name: `${pick(FIRST)} ${pick(LAST)}`,
      gender,
      dob: `${2008 + Math.floor(random() * 8)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      phone,
      guardian_name: `${pick(GUARDIAN)} ${pick(LAST)}`,
      guardian_phone: `018${String(20000000 + index).slice(-8)}`,
      admitted_on: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      status: random() < 0.9 ? 'active' : pick(['dropped', 'passed_out'] as const),
    })
  }
  return rows
}
