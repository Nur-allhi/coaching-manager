/**
 * Students module service (T-042, D-043).
 * The only boundary UI code may call. Validates with Zod, allocates the human-facing number in
 * the same transaction as the row, and compresses an optional photo before storing it as a blob.
 */
import { makeAuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { VersionConflictError } from '@/core/db/repository'
import * as repo from './repository'
import {
  photoSchema,
  studentForm,
  toStudentPatch,
  type StudentFilter,
  type StudentForm,
  type StudentRow,
} from './types'

/** A typed module error; the screen maps `key` to an i18n string at the edge. */
export class StudentsValidationError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'StudentsValidationError'
    this.key = key
  }
}

function validated(values: StudentForm): StudentForm {
  const result = studentForm.safeParse(values)
  if (!result.success) throw new StudentsValidationError('students.invalidInput')
  return result.data
}

export async function listStudents(db: Db, filter: StudentFilter = {}): Promise<StudentRow[]> {
  return repo.search(db, filter)
}

export async function listTrash(db: Db): Promise<StudentRow[]> {
  return repo.trash(db)
}

export async function getStudent(db: Db, id: string): Promise<StudentRow | undefined> {
  return repo.byId(db, id)
}

/** Admit in one transaction: allocate the number and write the audited row atomically. */
export async function admit(
  db: Db,
  values: StudentForm,
  photo: Uint8Array | null = null,
): Promise<string> {
  const form = validated(values)
  if (photo !== null) photoSchema.parse(photo)
  return db.tx(async (t) => {
    const ctx = makeAuditContext()
    const studentNo = await repo.nextStudentNo(t, form.admittedOn.slice(0, 4))
    return repo.createWithin(t, ctx, { ...toStudentPatch(form), student_no: studentNo, photo })
  })
}

export async function saveStudent(
  db: Db,
  id: string,
  version: number,
  values: StudentForm,
): Promise<void> {
  const form = validated(values)
  await repo.updateStudent(db, makeAuditContext(), id, toStudentPatch(form), version)
}

/** Save an optional compressed photo without touching the other fields or their version. */
export async function savePhoto(
  db: Db,
  id: string,
  version: number,
  photo: Uint8Array,
): Promise<void> {
  photoSchema.parse(photo)
  const current = await repo.byId(db, id)
  if (!current) throw new VersionConflictError(id)
  await repo.updateStudent(db, makeAuditContext(), id, { photo }, version)
}

export async function setStatus(
  db: Db,
  id: string,
  version: number,
  status: StudentForm['status'],
): Promise<void> {
  const parsed = studentForm.shape.status.safeParse(status)
  if (!parsed.success) throw new StudentsValidationError('students.invalidInput')
  await repo.updateStudent(db, makeAuditContext(), id, { status: parsed.data }, version)
}

export async function removeStudent(db: Db, id: string, version: number): Promise<void> {
  await repo.softDeleteStudent(db, makeAuditContext(), id, version)
}

export async function restoreStudent(db: Db, id: string, version: number): Promise<void> {
  await db.tx((t) => repo.restoreWithin(t, makeAuditContext(), id, version))
}

/** The number that would be allocated next, for the admission form preview. */
export async function previewStudentNo(db: Db, admittedOn: string): Promise<string> {
  return repo.nextStudentNo(db, admittedOn.slice(0, 4))
}
