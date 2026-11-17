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

/** Deterministic payment rows for the T-083 budget run, keyed to generated student numbers. */
export interface SeedPayment {
  id: string
  student_no: string
  receipt_no: string
  paid_on: string
  amount_minor: number
  method: 'cash' | 'bank' | 'mobile'
}

export function generatePayments(
  count: number,
  seed = 2,
  studentCount = 5000,
  year = 2026,
): SeedPayment[] {
  const random = prng(seed)
  const methods = ['cash', 'bank', 'mobile'] as const
  return Array.from({ length: count }, (_, index) => {
    const month = 1 + Math.floor(random() * 12)
    const day = 1 + Math.floor(random() * 28)
    return {
      id: `p-${String(index + 1).padStart(6, '0')}`,
      student_no: `${year}-${String((index % studentCount) + 1).padStart(4, '0')}`,
      receipt_no: `R-${String(index + 1).padStart(6, '0')}`,
      paid_on: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      amount_minor: 1000 + Math.floor(random() * 20_000),
      method: methods[Math.floor(random() * methods.length)] as SeedPayment['method'],
    }
  })
}

/** Deterministic exam-result rows: `examCount` exams x `studentCount` students = `count`. */
export interface SeedMark {
  exam_index: number
  student_no: string
  marks: number
  absent: number
  updated_at: number
}

export function generateMarks(
  count: number,
  seed = 3,
  studentCount = 5000,
  examCount = 40,
  year = 2026,
): SeedMark[] {
  const random = prng(seed)
  return Array.from({ length: count }, (_, index) => ({
    // One full roster per exam: (exam, student) pairs must be unique for the junction PK.
    exam_index: Math.floor(index / studentCount) % examCount,
    student_no: `${year}-${String((index % studentCount) + 1).padStart(4, '0')}`,
    marks: random() < 0.02 ? 0 : Math.round(random() * 100),
    absent: random() < 0.02 ? 1 : 0,
    updated_at: Date.UTC(year, 0, 1) + index,
  }))
}
