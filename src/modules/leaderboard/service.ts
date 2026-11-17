/**
 * Leaderboard service (T-063, D-055). Validates a rank request before the read-model query and
 * exposes only read operations — the leaderboard module never writes (TAD §2 rule 3).
 */
import type { Db } from '@/core/db/types'
import { academicYearOptions, rankedRows } from './queries/rankings'
import type { RankQuery, RankRow } from './types'

export class LeaderboardValidationError extends Error {}

export async function rankedLeaderboard(db: Db, query: RankQuery): Promise<RankRow[]> {
  if (query.scope === 'exam' && !query.examId) throw new LeaderboardValidationError('examId')
  if (query.scope === 'month' && !/^\d{4}-\d{2}$/.test(query.month ?? '')) {
    throw new LeaderboardValidationError('month')
  }
  if (query.scope === 'year' && !query.academicYearId) {
    throw new LeaderboardValidationError('academicYearId')
  }
  return rankedRows(db, query)
}

export { academicYearOptions }
