/** Unit tests for students service commands (T-042, D-043 A1/C1). */
import { describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { getStudent, listStudents } from './service'
import { admit, removeStudent, restoreStudent, saveStudent, setStatus } from './service'
import type { StudentForm } from './types'

async function setup() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const values: StudentForm = {
    fullName: 'Rahim Uddin',
    gender: 'male',
    dob: '2010-05-01',
    phone: '01711000001',
    guardianName: 'Karim Uddin',
    guardianPhone: '01711000009',
    address: 'Dhaka',
    schoolName: 'School',
    admittedOn: '2026-01-15',
    status: 'active',
    notes: '',
  }
  return { db, values }
}

describe('students service', () => {
  it('allocates the student number from the admission year inside one transaction', async () => {
    const { db, values } = await setup()
    const id = await admit(db, values)
    expect((await getStudent(db, id))?.student_no).toBe('2026-0001')
    const nextId = await admit(db, { ...values, admittedOn: '2027-02-01' })
    expect((await getStudent(db, nextId))?.student_no).toBe('2027-0001')
  })

  it('stores a photo blob alongside the row', async () => {
    const { db, values } = await setup()
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const id = await admit(db, values, photo)
    expect(Array.from((await getStudent(db, id))?.photo ?? [])).toEqual(Array.from(photo))
  })

  it('edits a student and changes the status with version checks', async () => {
    const { db, values } = await setup()
    const id = await admit(db, values)
    await saveStudent(db, id, 1, { ...values, fullName: 'Rahim Khan' })
    expect((await getStudent(db, id))?.full_name).toBe('Rahim Khan')
    await setStatus(db, id, 2, 'dropped')
    expect((await getStudent(db, id))?.status).toBe('dropped')
    expect(await listStudents(db, { status: 'dropped' })).toHaveLength(1)
  })

  it('soft deletes and restores with a new audit entry without rewriting history', async () => {
    const { db, values } = await setup()
    const id = await admit(db, values)
    await removeStudent(db, id, 1)
    expect(await getStudent(db, id)).toBeUndefined()
    expect(await listStudents(db, { includeDeleted: true })).toHaveLength(1)

    await restoreStudent(db, id, 2)
    expect((await getStudent(db, id))?.full_name).toBe('Rahim Uddin')

    const actions = await db.query<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity = 'students' ORDER BY at, id",
    )
    expect(actions.map((a) => a.action)).toEqual(['create', 'delete', 'restore'])
  })

  it('rejects an invalid form at the boundary', async () => {
    const { db, values } = await setup()
    await expect(admit(db, { ...values, fullName: '' })).rejects.toThrow()
  })

  it('rejects an unbounded photo passed by a non-UI caller', async () => {
    const { db, values } = await setup()
    await expect(admit(db, values, new Uint8Array(65 * 1024))).rejects.toThrow()
  })
})
