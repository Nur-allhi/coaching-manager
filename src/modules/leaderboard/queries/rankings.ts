/**
 * Ranking read model (T-063, D-055). TAD §2 rule 3 lets a read-model module read any table from
 * files in its own `queries/` folder; this module never writes. Competition ranking uses SQL's
 * RANK() so ties share a rank and the next rank skips (1, 2, 2, 4).
 */
import type { Db, DbParam } from '@/core/db/types'
import type { RankQuery, RankRow } from '../types'

interface RawRankRow {
  rank: number
  student_id: string
  student_name: string
  student_no: string
  batch_name: string
  total_marks: number
  average: number | null
  absent_count: number
  exam_count: number
}

export async function rankedRows(db: Db, query: RankQuery): Promise<RankRow[]> {
  const where = ['e.deleted_at IS NULL', 'b.deleted_at IS NULL']
  const params: DbParam[] = []

  // The service validates that the selector for the active scope is present before calling here.
  if (query.scope === 'exam') {
    where.push('e.id = ?')
    params.push(query.examId ?? '')
  } else if (query.scope === 'month') {
    where.push('substr(e.held_on, 1, 7) = ?')
    params.push(query.month ?? '')
  } else {
    where.push('b.academic_year_id = ?')
    params.push(query.academicYearId ?? '')
  }

  if (query.filter.kind === 'batch') {
    where.push('b.id = ?')
    params.push(query.filter.id)
  } else if (query.filter.kind === 'class') {
    where.push('b.class_id = ?')
    params.push(query.filter.id)
  }

  const sql = `WITH per_exam AS (
      SELECT e.id AS exam_id, er.student_id, er.marks AS raw_marks, er.absent,
             CASE WHEN er.absent = 1 OR er.marks IS NULL THEN 0 ELSE er.marks END AS counted,
             b.name AS batch_name
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      JOIN batches b ON b.id = e.batch_id
      WHERE ${where.join(' AND ')}
    ), agg AS (
      SELECT student_id, MAX(batch_name) AS batch_name,
             SUM(counted) AS total_marks,
             AVG(CASE WHEN absent = 0 THEN raw_marks END) AS average,
             SUM(CASE WHEN absent = 1 THEN 1 ELSE 0 END) AS absent_count,
             COUNT(*) AS exam_count
      FROM per_exam
      GROUP BY student_id
    )
    SELECT RANK() OVER (ORDER BY a.total_marks DESC) AS rank,
           a.student_id, s.full_name AS student_name, s.student_no, a.batch_name,
           a.total_marks, a.average, a.absent_count, a.exam_count
    FROM agg a
    JOIN students s ON s.id = a.student_id AND s.deleted_at IS NULL
    ORDER BY rank, a.student_id`
  const rows = await db.query<RawRankRow>(sql, params)
  return rows.map((row) => ({
    rank: Number(row.rank),
    studentId: row.student_id,
    studentName: row.student_name,
    studentNo: row.student_no,
    batchName: row.batch_name,
    totalMarks: Number(row.total_marks),
    average: row.average === null ? null : Math.round(Number(row.average) * 100) / 100,
    absentCount: Number(row.absent_count),
    examCount: Number(row.exam_count),
  }))
}

/** Academic years for the scope selector; read-only, via this module's queries folder. */
export function academicYearOptions(db: Db): Promise<Array<{ id: string; name: string }>> {
  return db
    .query<{ id: string; name: string }>(
      'SELECT id, name FROM academic_years WHERE deleted_at IS NULL ORDER BY starts_on DESC',
    )
    .then((rows) => rows.map((row) => ({ id: row.id, name: row.name })))
}
