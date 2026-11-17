/**
 * Academics module service (T-041, D-042).
 *
 * The only boundary UI code may call. Every write validates with Zod, then goes through the
 * audited repository helpers. The two warnings are pure/service logic so they are testable
 * without a browser: a schedule clash is a non-blocking query, and capacity is a non-blocking
 * comparison against an occupancy the caller supplies (academics never reads enrollments).
 */
import type { z } from 'zod'
import { makeAuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'
import { parseToMinor } from '@/core/money/money'
import * as repo from './repository'
import type { SubjectRow } from './types'
import {
  batchForm,
  classForm,
  daysToMask,
  optionalText,
  subjectForm,
  toClassPatch,
  toSubjectPatch,
  toYearPatch,
  yearForm,
  type BatchForm,
  type BatchRow,
  type ClassForm,
  type ClassRow,
  type Kind,
  type SubjectForm,
  type YearForm,
} from './types'

/** A typed module error; the screen maps `key` to an i18n string at the edge. */
export class AcademicsValidationError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'AcademicsValidationError'
    this.key = key
  }
}

function parsed<T>(schema: z.ZodType<T>, values: unknown): T {
  const result = schema.safeParse(values)
  if (!result.success) throw new AcademicsValidationError('academics.invalidInput')
  return result.data
}

/** Public read surface: live batches, for other modules' fee defaults and capacity checks. */
export function listBatches(db: Db): Promise<BatchRow[]> {
  return repo.batches.list(db)
}

/** Public read surface: live classes, for other modules' class filters and labels (T-053). */
export function listClasses(db: Db): Promise<ClassRow[]> {
  return repo.classes.list(db)
}

/** Public read surface: live subjects, for other modules' subject pickers (T-061). */
export function listSubjects(db: Db): Promise<SubjectRow[]> {
  return repo.subjects.list(db)
}

export interface AcademicsData {
  years: Row[]
  classes: Row[]
  subjects: Row[]
  batches: Row[]
}

export async function getAll(db: Db): Promise<AcademicsData> {
  const [years, classes, subjects, batches] = await Promise.all([
    repo.years.list(db),
    repo.classes.list(db),
    repo.subjects.list(db),
    repo.batches.list(db),
  ])
  return { years, classes, subjects, batches }
}

function createYear(db: Db, values: YearForm): Promise<string> {
  return repo.years.create(db, makeAuditContext(), toYearPatch(parsed(yearForm, values)))
}
function updateYear(db: Db, id: string, values: YearForm, version: number): Promise<void> {
  return repo.years.update(
    db,
    makeAuditContext(),
    id,
    toYearPatch(parsed(yearForm, values)),
    version,
  )
}
function createClass(db: Db, values: ClassForm): Promise<string> {
  return repo.classes.create(db, makeAuditContext(), toClassPatch(parsed(classForm, values)))
}
function updateClass(db: Db, id: string, values: ClassForm, version: number): Promise<void> {
  return repo.classes.update(
    db,
    makeAuditContext(),
    id,
    toClassPatch(parsed(classForm, values)),
    version,
  )
}
function createSubject(db: Db, values: SubjectForm): Promise<string> {
  return repo.subjects.create(db, makeAuditContext(), toSubjectPatch(parsed(subjectForm, values)))
}
function updateSubject(db: Db, id: string, values: SubjectForm, version: number): Promise<void> {
  return repo.subjects.update(
    db,
    makeAuditContext(),
    id,
    toSubjectPatch(parsed(subjectForm, values)),
    version,
  )
}

export function toBatchPatch(values: BatchForm): Row {
  const v = parsed(batchForm, values)
  if (v.endTime <= v.startTime) throw new AcademicsValidationError('academics.endBeforeStart')
  if (daysToMask(v.days) === 0) throw new AcademicsValidationError('academics.noDays')
  return {
    academic_year_id: v.academicYearId,
    class_id: v.classId,
    name: v.name,
    days_mask: daysToMask(v.days),
    start_time: v.startTime,
    end_time: v.endTime,
    room: optionalText(v.room),
    capacity: v.capacity === '' ? null : Number(v.capacity),
    monthly_fee_minor: parseToMinor(v.monthlyFee),
  }
}

function createBatch(db: Db, values: BatchForm): Promise<string> {
  return repo.batches.create(db, makeAuditContext(), toBatchPatch(values))
}
function updateBatch(db: Db, id: string, values: BatchForm, version: number): Promise<void> {
  return repo.batches.update(db, makeAuditContext(), id, toBatchPatch(values), version)
}

/** Names of live batches in the same room, on a shared day, with an overlapping time span. */
export async function findBatchClashes(db: Db, patch: Row, excludeId?: string): Promise<string[]> {
  const room = patch.room
  if (typeof room !== 'string' || room === '') return []
  const rows = await db.query<Pick<BatchRow, 'name' | 'days_mask' | 'start_time' | 'end_time'>>(
    'SELECT name, days_mask, start_time, end_time FROM batches ' +
      'WHERE deleted_at IS NULL AND room = ?' +
      (excludeId ? ' AND id != ?' : ''),
    excludeId ? [room, excludeId] : [room],
  )
  const mask = Number(patch.days_mask)
  const start = String(patch.start_time)
  const end = String(patch.end_time)
  return rows
    .filter(
      (other) =>
        (Number(other.days_mask) & mask) !== 0 && start < other.end_time && other.start_time < end,
    )
    .map((other) => other.name)
}

/** A warning, never a block: more students than the batch's capacity. */
export function capacityWarning(capacity: number | null, enrolledCount: number): boolean {
  return capacity !== null && enrolledCount > capacity
}

/** The one command shape used by the optimistic mutation and the real write. */
export type SaveCommand =
  | { kind: 'years'; values: YearForm; id?: string; version?: number }
  | { kind: 'classes'; values: ClassForm; id?: string; version?: number }
  | { kind: 'subjects'; values: SubjectForm; id?: string; version?: number }
  | { kind: 'batches'; values: BatchForm; id?: string; version?: number }

export type DeleteCommand = { kind: Kind; id: string; version: number }

/** A row-shaped value for the optimistic cache preview; ids are server-derived on real creates. */
export function previewRow(command: SaveCommand): Row {
  const id = command.id ?? '__pending__'
  switch (command.kind) {
    case 'years':
      return { id, version: 1, ...toYearPatch(command.values) }
    case 'classes':
      return { id, version: 1, ...toClassPatch(command.values) }
    case 'subjects':
      return { id, version: 1, ...toSubjectPatch(command.values) }
    case 'batches':
      return { id, version: 1, ...toBatchPatch(command.values) }
  }
}

export async function executeSave(db: Db, command: SaveCommand): Promise<void> {
  const version = command.version ?? 1
  switch (command.kind) {
    case 'years':
      if (command.id) await updateYear(db, command.id, command.values, version)
      else await createYear(db, command.values)
      return
    case 'classes':
      if (command.id) await updateClass(db, command.id, command.values, version)
      else await createClass(db, command.values)
      return
    case 'subjects':
      if (command.id) await updateSubject(db, command.id, command.values, version)
      else await createSubject(db, command.values)
      return
    case 'batches':
      if (command.id) await updateBatch(db, command.id, command.values, version)
      else await createBatch(db, command.values)
      return
  }
}

export async function executeDelete(db: Db, command: DeleteCommand): Promise<void> {
  const ctx = makeAuditContext()
  switch (command.kind) {
    case 'years':
      await repo.years.remove(db, ctx, command.id, command.version)
      return
    case 'classes':
      await repo.classes.remove(db, ctx, command.id, command.version)
      return
    case 'subjects':
      await repo.subjects.remove(db, ctx, command.id, command.version)
      return
    case 'batches':
      await repo.batches.remove(db, ctx, command.id, command.version)
      return
  }
}
