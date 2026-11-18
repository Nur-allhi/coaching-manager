/**
 * Test-only route (`/__demo-fixture`) that fills every module with one coherent dataset:
 * academic structure, students, enrollments (including transfers), charges, payments,
 * attendance, exams with marks, and absences. Uses the real services so receipts, dues,
 * percentages and grades all agree. Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { insert } from '@/core/db/repository'
import { getDb } from '@/core/db/client'
import { generateStudents } from '../../../scripts/seed-data.ts'
import { generateCharges } from '@/modules/payments/service'
import { recordPayment } from '@/modules/payments/payment-service'
import {
  openAndMarkAllPresent,
  setStatus as setAttendanceStatus,
} from '@/modules/attendance/service'
import { createExam, saveResult } from '@/modules/exams/service'

const BATCHES = [
  { name: 'Morning', start: '08:00', end: '09:30', days: 62, fee: 1500, room: 'Room 101' },
  { name: 'Day', start: '10:00', end: '11:30', days: 62, fee: 1800, room: 'Room 102' },
  { name: 'Evening', start: '16:00', end: '17:30', days: 62, fee: 1200, room: 'Room 103' },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function DemoDataFixture() {
  const [count, setCount] = useState('120')
  const [status, setStatus] = useState('idle')
  const [details, setDetails] = useState('')

  async function seed() {
    const n = Number(count)
    if (!Number.isSafeInteger(n) || n < 10 || n > 500) {
      setStatus('Enter a number between 10 and 500')
      return
    }
    const db = getDb()
    const existing = await db.query<{ id: string }>(
      "SELECT id FROM academic_years WHERE name = 'Demo 2026' AND deleted_at IS NULL",
    )
    if (existing.length > 0) {
      setStatus('already seeded')
      setDetails('Clear site data in the browser to seed again.')
      return
    }

    setStatus('seeding — this can take a minute')
    let step = 'structure'
    try {
      const ctx = makeAuditContext('demo-fixture')
      const base = { created_at: ctx.now, updated_at: ctx.now, deleted_at: null }

      const yearId = ctx.newId()
      await insert(db, ctx, 'academic_years', {
        ...base,
        id: yearId,
        version: 1,
        name: 'Demo 2026',
        starts_on: '2026-01-01',
        ends_on: '2026-12-31',
        is_current: 1,
      })

      const classIds: string[] = []
      for (const [i, name] of ['Class 9', 'Class 10', 'Class 11'].entries()) {
        const id = ctx.newId()
        await insert(db, ctx, 'classes', { ...base, id, version: 1, name, sort_order: i + 1 })
        classIds.push(id)
      }

      const subjectIds: string[] = []
      const subjectRows: Array<[string, string]> = [
        ['Mathematics', 'MATH'],
        ['Bangla', 'BAN'],
        ['English', 'ENG'],
        ['Science', 'SCI'],
        ['History', 'HIS'],
      ]
      for (const [name, code] of subjectRows) {
        const id = ctx.newId()
        await insert(db, ctx, 'subjects', { ...base, id, version: 1, name, code })
        subjectIds.push(id)
      }

      const batchIds: string[] = []
      for (const b of BATCHES) {
        const id = ctx.newId()
        await insert(db, ctx, 'batches', {
          ...base,
          id,
          version: 1,
          academic_year_id: yearId,
          class_id: classIds[1] as string,
          name: b.name,
          days_mask: b.days,
          start_time: b.start,
          end_time: b.end,
          room: b.room,
          capacity: Math.ceil(n / BATCHES.length) + 10,
          monthly_fee_minor: b.fee,
          status: 'active',
        })
        batchIds.push(id)
      }

      step = 'students and enrollments'
      const students = generateStudents(n, 7, 2026)
      const roster: Array<{ id: string; batchId: string }> = []
      for (let i = 0; i < students.length; i += 1) {
        const s = students[i]
        if (!s) continue
        const id = ctx.newId()
        const batchId = batchIds[i % batchIds.length] as string
        await insert(db, ctx, 'students', {
          ...base,
          id,
          version: 1,
          student_no: `2026-${String(1001 + i).padStart(4, '0')}`,
          full_name: s.full_name,
          gender: s.gender,
          dob: s.dob,
          phone: s.phone,
          guardian_name: s.guardian_name,
          guardian_phone: s.guardian_phone,
          address: `${10 + (i % 80)}, Main Road, Dhaka`,
          school_name: i % 3 === 0 ? 'City High School' : 'Local Government School',
          admitted_on: s.admitted_on,
          status: 'active',
          notes: i % 11 === 0 ? 'Needs follow-up on fees.' : null,
        })
        const fee = BATCHES[i % BATCHES.length]?.fee ?? 1500
        await insert(db, ctx, 'enrollments', {
          ...base,
          id: ctx.newId(),
          version: 1,
          student_id: id,
          batch_id: batchId,
          enrolled_on: s.admitted_on,
          left_on: null,
          admission_fee_minor: 2000,
          monthly_fee_minor: fee,
          discount_kind: i % 9 === 0 ? 'percent' : i % 13 === 0 ? 'fixed' : 'none',
          discount_value: i % 9 === 0 ? 10 : i % 13 === 0 ? 50 : 0,
          status: 'active',
        })
        roster.push({ id, batchId })
      }

      // A handful of transfers: old enrollment closed, new one opened in another batch.
      for (let i = 4; i < roster.length; i += 23) {
        const r = roster[i]
        if (!r) continue
        const transfers = await db.query<{ id: string; monthly_fee_minor: number }>(
          'SELECT id, monthly_fee_minor FROM enrollments WHERE student_id = ? AND status = ? AND deleted_at IS NULL',
          [r.id, 'active'],
        )
        const old = transfers[0]
        if (!old) continue
        const newBatch = batchIds[(batchIds.indexOf(r.batchId) + 1) % batchIds.length] as string
        const oldRow = await db.query<{ version: number; enrolled_on: string }>(
          'SELECT version, enrolled_on FROM enrollments WHERE id = ?',
          [old.id],
        )
        await db.run(
          'UPDATE enrollments SET left_on = ?, status = ?, version = version + 1, updated_at = ? WHERE id = ?',
          ['2026-06-30', 'left', ctx.now, old.id],
        )
        await insert(db, ctx, 'enrollments', {
          ...base,
          id: ctx.newId(),
          version: 1,
          student_id: r.id,
          batch_id: newBatch,
          enrolled_on: '2026-07-01',
          left_on: null,
          admission_fee_minor: 0,
          monthly_fee_minor: Number(old.monthly_fee_minor),
          discount_kind: 'none',
          discount_value: 0,
          status: 'active',
        })
        void oldRow
      }

      step = 'fees and payments'
      for (const month of ['2026-09', '2026-10', '2026-11']) await generateCharges(db, month)

      let paidCount = 0
      for (let i = 0; i < roster.length; i += 1) {
        const r = roster[i]
        if (!r || i % 10 >= 6) continue
        const fee = Number(
          (
            await db.query<{ monthly_fee_minor: number }>(
              'SELECT monthly_fee_minor FROM enrollments WHERE student_id = ? AND status = ? AND deleted_at IS NULL LIMIT 1',
              [r.id, 'active'],
            )
          )[0]?.monthly_fee_minor ?? 1500,
        )
        const amount = i % 5 === 0 ? fee * 3 + 500 : i % 3 === 0 ? Math.round(fee * 0.5) : fee
        await recordPayment(db, {
          studentId: r.id,
          paidOn: `2026-11-${String(1 + (i % 25)).padStart(2, '0')}`,
          method: i % 4 === 0 ? 'bank' : i % 4 === 1 ? 'mobile' : 'cash',
          amountMinor: amount,
          note: i % 7 === 0 ? 'Advance payment' : '',
        })
        paidCount += 1
      }

      step = 'attendance'
      let sessions = 0
      for (let b = 0; b < batchIds.length; b += 1) {
        const batchId = batchIds[b] as string
        for (let d = 0; d < 5; d += 1) {
          const { sessionId } = await openAndMarkAllPresent(db, batchId, daysAgo(d))
          sessions += 1
          const inBatch = roster.filter((r) => r.batchId === batchId)
          for (let k = 0; k < inBatch.length; k += 7) {
            const student = inBatch[k]
            if (student) await setAttendanceStatus(db, sessionId, student.id, 'absent')
          }
        }
      }

      step = 'exams and marks'
      let exams = 0
      for (let b = 0; b < batchIds.length; b += 1) {
        const batchId = batchIds[b] as string
        const inBatch = roster.filter((r) => r.batchId === batchId)
        const examRows: Array<[string, string]> = [
          ['Midterm', '2026-10-15'],
          ['Final', '2026-11-10'],
        ]
        for (const [name, heldOn] of examRows) {
          const examId = await createExam(db, {
            batchId,
            subjectId: subjectIds[b % subjectIds.length] ?? null,
            heldOn,
            name,
            fullMarks: 100,
            passMarks: 33,
          })
          exams += 1
          for (let i = 0; i < inBatch.length; i += 1) {
            const student = inBatch[i]
            if (!student) continue
            const absent = i % 17 === 0
            await saveResult(
              db,
              examId,
              student.id,
              absent ? null : 38 + ((i * 7 + b * 3) % 60),
              absent,
            )
          }
        }
      }

      setStatus(`done — ${n} students`)
      setDetails(
        `${batchIds.length} batches, ${n} students, ${paidCount} payments, ${sessions} attendance sessions, ${exams} exams. ` +
          `Open each module to explore. Clear site data to start fresh.`,
      )
    } catch (error) {
      setStatus(`failed at ${step}`)
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Demo data</h1>
      <p className="text-muted-foreground text-sm">
        Fills every module with one coherent dataset so you can explore the whole app.
      </p>
      <input
        aria-label="Students to generate"
        data-testid="demo-count"
        className="border-input bg-background w-32 rounded border px-2 py-1 text-sm"
        value={count}
        onChange={(e) => setCount(e.target.value)}
      />
      <button
        type="button"
        data-testid="demo-seed"
        className="rounded border px-3 py-2 text-sm"
        onClick={() => void seed()}
      >
        Seed demo data
      </button>
      <p data-testid="demo-status">{status}</p>
      <p className="text-muted-foreground text-sm">{details}</p>
    </main>
  )
}
