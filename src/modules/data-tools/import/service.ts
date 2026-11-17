/**
 * Import orchestration (T-081, D-061): parse → preview (the dry run) → one audited transaction
 * after a forced pre-import snapshot. Existing students are matched by number or phone + name, so
 * importing the same file twice never duplicates them.
 */
import type { AuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { createSnapshot } from '@/core/backup/snapshots'
import type { SnapshotStorage } from '@/core/backup/storage'
import { listStudents } from '@/modules/students'
import { examOptions } from '@/modules/exams'
import { getAll as getAllAcademics } from '@/modules/academics/service'
import * as studentsRepo from '@/modules/students/repository'
import * as academicsRepo from '@/modules/academics/repository'
import * as enrollmentsRepo from '@/modules/enrollments/repository'
import * as examsRepo from '@/modules/exams/repository'
import { readImportTable } from './excel'
import type { ImportKind } from './template'
import {
  buildPreview,
  defaultMapping,
  type ColumnMapping,
  type ImportPreview,
  type ImportRow,
} from './validate'

async function existingKeys(db: Db, kind: ImportKind): Promise<Set<string>> {
  if (kind !== 'students') return new Set()
  const students = await listStudents(db)
  const keys = new Set<string>()
  for (const student of students) {
    keys.add(student.student_no.toLowerCase())
    keys.add(`${student.phone ?? ''}|${student.full_name ?? ''}`.toLowerCase())
  }
  return keys
}

/** Parse and validate without writing. This is the dry run: the caller can show the preview safely. */
export async function previewImport(
  db: Db,
  name: string,
  bytes: Uint8Array,
  kind: ImportKind,
  mapping?: ColumnMapping,
): Promise<ImportPreview> {
  const table = await readImportTable(name, bytes)
  return buildPreview(
    table,
    kind,
    mapping ?? defaultMapping(table.headers, kind),
    await existingKeys(db, kind),
  )
}

/** Explicit alias: a dry run is a preview and must change nothing. */
export const dryRunImport = previewImport

export interface ImportResult {
  imported: number
  snapshot: string | undefined
}

async function writeRow(
  t: Db,
  ctx: AuditContext,
  kind: ImportKind,
  values: Record<string, string>,
): Promise<void> {
  if (kind === 'students') {
    const year = (values.admitted_on ?? '').slice(0, 4)
    const studentNo = values.student_no || (await studentsRepo.nextStudentNo(t, year))
    await studentsRepo.createWithin(t, ctx, {
      student_no: studentNo,
      full_name: values.full_name ?? '',
      admitted_on: values.admitted_on ?? '',
      status: (values.status || 'active').toLowerCase(),
      phone: values.phone || null,
      guardian_name: values.guardian_name || null,
    })
    return
  }

  const academics = await getAllAcademics(t)
  if (kind === 'batches') {
    const year = academics.years.find((row) => row.name === values.academic_year)
    const classRow = academics.classes.find((row) => row.name === values.class)
    if (!year || !classRow) throw new Error('Unknown academic year or class')
    await academicsRepo.batches.create(t, ctx, {
      academic_year_id: String(year.id),
      class_id: String(classRow.id),
      name: values.name ?? '',
      days_mask: Number(values.days_mask ?? 0),
      start_time: values.start_time ?? '',
      end_time: values.end_time ?? '',
      room: values.room || null,
      capacity: values.capacity ? Number(values.capacity) : null,
      monthly_fee_minor: Number(values.monthly_fee_minor ?? 0),
      status: 'active',
    })
    return
  }

  if (kind === 'enrollments') {
    const student = (await listStudents(t)).find((row) => row.student_no === values.student_no)
    const batch = academics.batches.find((row) => row.name === values.batch)
    if (!student || !batch) throw new Error('Unknown student or batch')
    await enrollmentsRepo.createWithin(t, ctx, {
      student_id: String(student.id),
      batch_id: String(batch.id),
      enrolled_on: values.enrolled_on ?? '',
      left_on: null,
      admission_fee_minor: Number(values.admission_fee_minor ?? 0),
      monthly_fee_minor: Number(values.monthly_fee_minor ?? 0),
      discount_kind: 'none',
      discount_value: 0,
      status: 'active',
    })
    return
  }

  const exam = (await examOptions(t)).find((row) => row.name === values.exam)
  const student = (await listStudents(t)).find((row) => row.student_no === values.student_no)
  if (!exam || !student) throw new Error('Unknown exam or student')
  await examsRepo.upsertResultWithin(
    t,
    exam.id,
    String(student.id),
    values.absent === '1' ? null : Number(values.marks ?? 0),
    values.absent === '1',
    '',
    ctx.now,
  )
}

/** Commit only the valid rows: forced snapshot first, then one transaction for all audited writes. */
export async function commitImport(
  db: Db,
  storage: SnapshotStorage,
  kind: ImportKind,
  preview: ImportPreview,
  ctx: AuditContext,
  now: number,
): Promise<ImportResult> {
  const snapshot = await createSnapshot({ db, storage, reason: 'pre-import', now, force: true })
  const rows = preview.rows.filter((row) => row.errors.length === 0)
  await db.tx(async (t) => {
    for (const row of rows) await writeRow(t, ctx, kind, row.values)
  })
  return {
    imported: rows.length,
    snapshot: snapshot.status === 'created' ? snapshot.file : undefined,
  }
}

export type { ColumnMapping, ImportPreview, ImportRow }
