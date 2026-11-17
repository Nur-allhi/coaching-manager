/**
 * Pure, row-level import validation (D-061 C1). Errors are i18n keys so the screen maps them at
 * the edge; no row is written here and no row is written until `commitImport` is called.
 */
import type { ImportTable } from './excel'
import { TEMPLATE_FIELDS, type ImportKind } from './template'

export type ColumnMapping = Record<string, number>

export interface ImportRow {
  rowNumber: number
  values: Record<string, string>
  /** i18n keys, e.g. `import.required`. */
  errors: string[]
}

export interface ImportPreview {
  kind: ImportKind
  rows: ImportRow[]
  validCount: number
  errorCount: number
}

const REQUIRED: Record<ImportKind, readonly string[]> = {
  students: ['full_name', 'admitted_on'],
  batches: ['name', 'academic_year', 'class', 'start_time', 'end_time', 'monthly_fee_minor'],
  enrollments: ['student_no', 'batch', 'enrolled_on', 'monthly_fee_minor'],
  marks: ['exam', 'student_no', 'marks'],
}

const INTEGER_FIELDS: Record<ImportKind, readonly string[]> = {
  students: [],
  batches: ['days_mask', 'capacity', 'monthly_fee_minor'],
  enrollments: ['admission_fee_minor', 'monthly_fee_minor'],
  marks: ['absent'],
}

export function defaultMapping(headers: readonly string[], kind: ImportKind): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (const field of TEMPLATE_FIELDS[kind]) {
    const index = headers.findIndex((header) => header.trim().toLowerCase() === field)
    mapping[field] = index >= 0 ? index : -1
  }
  return mapping
}

function rowKey(kind: ImportKind, values: Record<string, string>): string {
  switch (kind) {
    case 'students':
      return (values.student_no || `${values.phone ?? ''}|${values.full_name ?? ''}`).toLowerCase()
    case 'batches':
      return `${values.name ?? ''}|${values.academic_year ?? ''}|${values.class ?? ''}`.toLowerCase()
    case 'enrollments':
      return `${values.student_no ?? ''}|${values.batch ?? ''}|${values.enrolled_on ?? ''}`.toLowerCase()
    case 'marks':
      return `${values.exam ?? ''}|${values.student_no ?? ''}`.toLowerCase()
  }
}

function validateValue(field: string, value: string, kind: ImportKind): string | null {
  if (value === '') return null
  if (field === 'student_no' && !/^\d{4}-\d{4}$/.test(value)) return 'import.badStudentNo'
  if ((field === 'admitted_on' || field === 'enrolled_on') && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'import.badDate'
  }
  if (field === 'status' && !['active', 'dropped', 'passed_out'].includes(value.toLowerCase())) {
    return 'import.badStatus'
  }
  if (INTEGER_FIELDS[kind].includes(field) && !/^\d+$/.test(value)) return 'import.badInteger'
  if (field === 'marks' && !(Number.isFinite(Number(value)) && Number(value) >= 0)) {
    return 'import.badMarks'
  }
  return null
}

export function buildPreview(
  table: ImportTable,
  kind: ImportKind,
  mapping: ColumnMapping,
  existingKeys: ReadonlySet<string> = new Set(),
): ImportPreview {
  const seen = new Set<string>(existingKeys)
  const rows: ImportRow[] = []

  table.rows.forEach((source, index) => {
    const values: Record<string, string> = {}
    const errors: string[] = []
    for (const field of TEMPLATE_FIELDS[kind]) {
      const column = mapping[field] ?? -1
      values[field] = column >= 0 ? (source[column] ?? '').trim() : ''
    }
    for (const field of REQUIRED[kind]) {
      if (values[field] === '') errors.push(`import.required:${field}`)
    }
    for (const field of TEMPLATE_FIELDS[kind]) {
      const error = validateValue(field, values[field] ?? '', kind)
      if (error) errors.push(error)
    }
    const key = rowKey(kind, values)
    if (key !== '' && key !== '|' && seen.has(key)) errors.push('import.duplicate')
    if (key !== '' && key !== '|') seen.add(key)

    rows.push({ rowNumber: index + 2, values, errors })
  })

  return {
    kind,
    rows,
    errorCount: rows.filter((row) => row.errors.length > 0).length,
    validCount: rows.filter((row) => row.errors.length === 0).length,
  }
}
