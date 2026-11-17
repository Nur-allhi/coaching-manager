/** Unit tests for grade conversion (T-062, D-054). */
import { describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { getSetting, type GradingScale } from '@/modules/settings'
import { setSetting } from '@/modules/settings/repository'
import { DEFAULT_GRADING_SCALE } from '@/modules/settings/defaults'
import { gpaFor, gradeFor } from './grades'

describe('grade conversion', () => {
  it('maps the exact TAD §5.7 boundaries', () => {
    expect(gradeFor(80, DEFAULT_GRADING_SCALE)).toEqual({ label: 'A+', points: 5 })
    expect(gradeFor(100, DEFAULT_GRADING_SCALE)).toEqual({ label: 'A+', points: 5 })
    expect(gradeFor(79, DEFAULT_GRADING_SCALE)).toEqual({ label: 'A', points: 4 })
    expect(gradeFor(33, DEFAULT_GRADING_SCALE)).toEqual({ label: 'D', points: 1 })
  })

  it('grades every score below 33 as F worth 0', () => {
    expect(gradeFor(32, DEFAULT_GRADING_SCALE)).toEqual({ label: 'F', points: 0 })
    expect(gradeFor(0, DEFAULT_GRADING_SCALE)).toEqual({ label: 'F', points: 0 })
  })

  it('leaves absent and unmarked students ungraded', () => {
    expect(gradeFor(null, DEFAULT_GRADING_SCALE)).toBeNull()
  })

  it('averages grade points and excludes ungraded scores', () => {
    expect(gpaFor([80, 79, null], DEFAULT_GRADING_SCALE)).toBe(4.5)
    expect(gpaFor([null, null], DEFAULT_GRADING_SCALE)).toBeNull()
  })

  it('changes the grade when the scale changes in Settings', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    expect(gradeFor(80, await getSetting(db, 'gradingScale'))?.label).toBe('A+')

    const edited: GradingScale = DEFAULT_GRADING_SCALE.map((band) =>
      band.label === 'A+'
        ? { ...band, min: 90 }
        : band.label === 'A'
          ? { ...band, min: 70, max: 89 }
          : band,
    )
    await setSetting(db, 'gradingScale', edited)
    expect(gradeFor(80, await getSetting(db, 'gradingScale'))?.label).toBe('A')
  })
})
