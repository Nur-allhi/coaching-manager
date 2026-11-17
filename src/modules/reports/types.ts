/** Reports framework types (T-071, D-057). Read model only — no writes. */
import type { Db } from '@/core/db/types'

export interface ReportFilter {
  /** Inclusive `YYYY-MM-DD`. */
  from: string
  /** Inclusive `YYYY-MM-DD`. */
  to: string
  /** Empty string means all batches. */
  batchId: string
  /** Empty string means all classes. */
  classId: string
}

export interface ReportColumn {
  key: string
  labelKey: string
}

export type ReportRow = Record<string, string | number | null>

export interface ReportDefinition {
  id: string
  titleKey: string
  columns: ReportColumn[]
  load(db: Db, filter: ReportFilter): Promise<ReportRow[]>
}
