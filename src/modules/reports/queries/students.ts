/**
 * Student-list report (T-071): the worked example for the reports framework. TAD §2 rule 3 lets a
 * read-model module read any table from its own `queries/` folder; this module never writes.
 */
import type { Db, DbParam } from '@/core/db/types'
import type { ReportFilter, ReportRow } from '../types'

interface RawStudent {
  student_no: string
  student_name: string
  admitted_on: string
  batch_name: string | null
}

export async function studentListRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const params: DbParam[] = [filter.from, filter.to]
  let batchClause = ''
  if (filter.batchId !== '') {
    batchClause = 'AND b.id = ?'
    params.push(filter.batchId)
  }
  let classClause = ''
  if (filter.classId !== '') {
    classClause = 'AND b.class_id = ?'
    params.push(filter.classId)
  }
  const rows = await db.query<RawStudent>(
    `SELECT s.student_no, s.full_name AS student_name, s.admitted_on, b.name AS batch_name
     FROM students s
     LEFT JOIN enrollments en ON en.student_id = s.id AND en.deleted_at IS NULL
     LEFT JOIN batches b ON b.id = en.batch_id AND b.deleted_at IS NULL
     WHERE s.deleted_at IS NULL AND s.admitted_on BETWEEN ? AND ?
       ${batchClause} ${classClause}
     ORDER BY s.admitted_on, s.student_no`,
    params,
  )
  return rows.map((row) => ({
    studentNo: row.student_no,
    studentName: row.student_name,
    admittedOn: row.admitted_on,
    batchName: row.batch_name ?? '',
  }))
}
