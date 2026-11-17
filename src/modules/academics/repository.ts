/**
 * Typed academics repository (T-041, D-042 A1).
 *
 * The four tables carry the five COMMON columns, so every write goes through the shared audited
 * helpers in `@/core/db/repository`: version checks, soft delete, parent/child refusal and the
 * audit row in the same transaction all come from one place. This file only adds the table names
 * and the row shapes; all values are bound by the helpers.
 */
import type { AuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { findById, insert, list, softDelete, update, type Row } from '@/core/db/repository'
import type { AcademicYearRow, BatchRow, ClassRow, SubjectRow } from './types'

function stamp(ctx: AuditContext): Row {
  return {
    id: ctx.newId(),
    created_at: ctx.now,
    updated_at: ctx.now,
    deleted_at: null,
  }
}

function crud<T extends Row>(dbTable: 'academic_years' | 'classes' | 'subjects' | 'batches') {
  return {
    list: (db: Db) => list<T>(db, dbTable),
    byId: (db: Db, id: string) => findById<T>(db, dbTable, id),
    create: (db: Db, ctx: AuditContext, patch: Row) =>
      insert(db, ctx, dbTable, { ...stamp(ctx), ...patch }),
    update: (db: Db, ctx: AuditContext, id: string, patch: Row, version: number) =>
      update(db, ctx, dbTable, id, patch, version),
    remove: (db: Db, ctx: AuditContext, id: string, version: number) =>
      softDelete(db, ctx, dbTable, id, version),
  }
}

export const years = crud<AcademicYearRow>('academic_years')
export const classes = crud<ClassRow>('classes')
export const subjects = crud<SubjectRow>('subjects')
export const batches = crud<BatchRow>('batches')
