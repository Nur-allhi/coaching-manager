/**
 * Settings defaults and schemas (T-040, D-041).
 *
 * The grading-scale default matches docs/TAD.md §5.7 exactly. Zod validates every value at the
 * repository boundary so a malformed stored setting falls back to the documented default rather
 * than corrupting a screen.
 */
import { z } from 'zod'

export const GradeSchema = z.object({
  label: z.string().min(1),
  min: z.number().int().min(0).max(100),
  max: z.number().int().min(0).max(100),
  points: z.number().min(0).max(5),
})
export type Grade = z.infer<typeof GradeSchema>

export const GradingScaleSchema = z.array(GradeSchema).length(7)
export type GradingScale = z.infer<typeof GradingScaleSchema>

/** The seven bands from TAD.md §5.7, in descending order. */
export const DEFAULT_GRADING_SCALE: GradingScale = [
  { label: 'A+', min: 80, max: 100, points: 5.0 },
  { label: 'A', min: 70, max: 79, points: 4.0 },
  { label: 'A-', min: 60, max: 69, points: 3.5 },
  { label: 'B', min: 50, max: 59, points: 3.0 },
  { label: 'C', min: 40, max: 49, points: 2.0 },
  { label: 'D', min: 33, max: 39, points: 1.0 },
  { label: 'F', min: 0, max: 32, points: 0 },
]

export const DEFAULT_RECEIPT_FORMAT = 'R-YYYY-000001'

export interface CentreProfile {
  name: string
  logoDataUri: string
  address: string
  phone: string
}

export const CentreProfileSchema = z.object({
  name: z.string(),
  logoDataUri: z.string(),
  address: z.string(),
  phone: z.string(),
})

export const DEFAULT_CENTRE: CentreProfile = {
  name: 'Coaching Manager',
  logoDataUri: '',
  address: '',
  phone: '',
}

/** Map of setting key → { schema, default } used by the typed repository. */
export const SETTING_DEFINITIONS = {
  centre: { schema: CentreProfileSchema, fallback: DEFAULT_CENTRE },
  currency: { schema: z.string().min(1), fallback: 'BDT' },
  gradingScale: { schema: GradingScaleSchema, fallback: DEFAULT_GRADING_SCALE },
  receiptFormat: { schema: z.string().min(1), fallback: DEFAULT_RECEIPT_FORMAT },
} as const

export type SettingKey = keyof typeof SETTING_DEFINITIONS
