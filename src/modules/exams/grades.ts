/**
 * Grade conversion (T-062, D-054). Pure functions over the live Settings grading scale; no Db and
 * no module reads, so both the marks grid and later ranking/leaderboard can share one rule.
 * Grade points are the 0–5 values from TAD.md §5.7, not money.
 */
import type { GradingScale } from '@/modules/settings'

export interface Grade {
  label: string
  points: number
}

/** The band containing the score, with inclusive bounds (TAD §5.7). Null scores are ungraded. */
export function gradeFor(score: number | null, scale: GradingScale): Grade | null {
  if (score === null || !Number.isFinite(score)) return null
  const band = scale.find((b) => score >= b.min && score <= b.max)
  return band ? { label: band.label, points: band.points } : null
}

/** Mean grade point over the marked scores; null when none are graded. */
export function gpaFor(scores: Array<number | null>, scale: GradingScale): number | null {
  const points = scores
    .map((score) => gradeFor(score, scale))
    .filter((grade): grade is Grade => grade !== null)
    .map((grade) => grade.points)
  if (points.length === 0) return null
  const total = points.reduce((sum, value) => sum + value, 0)
  return Math.round((total / points.length) * 100) / 100
}
