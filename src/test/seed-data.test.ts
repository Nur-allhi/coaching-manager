/** T-044: the generator must be deterministic and usable by the suites. */
import { describe, expect, it } from 'vitest'
import { generateStudents, prng } from '../../scripts/seed-data.ts'

describe('seed generator', () => {
  it('produces the requested number of students', () => {
    for (const count of [1, 10, 5000]) {
      expect(generateStudents(count)).toHaveLength(count)
    }
  })

  it('produces identical data for the same seed and different data for a different seed', () => {
    const a = generateStudents(100, 7)
    const b = generateStudents(100, 7)
    const c = generateStudents(100, 8)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a).not.toEqual(c)
  })

  it('allocates gapless numbers and only known statuses', () => {
    const rows = generateStudents(50)
    expect(rows[0]?.student_no).toBe('2026-0001')
    expect(rows.at(-1)?.student_no).toBe('2026-0050')
    for (const row of rows) {
      expect(['active', 'dropped', 'passed_out']).toContain(row.status)
      expect(row.phone).toMatch(/^017\d{8}$/)
    }
  })

  it('the PRNG is reproducible on its own', () => {
    const a = prng(42)
    const b = prng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
