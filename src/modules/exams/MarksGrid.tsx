/**
 * Marks grid (T-061, D-052 C1/B1). Roving-tabindex ARIA grid: arrows move between students,
 * Enter saves marks, Space flags absence, Tab exits. Absent is a flag shown as "A", never as a
 * zero; the batch average covers entered marks of non-absent students only.
 */
import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDb } from '@/core/db/client'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { Button } from '@/components/ui/button'
import { cellsFor, ExamNotFoundError, loadExam, saveResult, summaryFor } from './service'
import type { ExamCell } from './types'

export function MarksGrid() {
  const { t } = useTranslation()
  const db = getDb()
  const { id = '' } = useParams()
  const [focused, setFocused] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState('')
  const rowRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const exam = useQuery({
    queryKey: ['exams', 'detail', id],
    queryFn: () => loadExam(db, id),
    retry: false,
    // A missing exam is handled below; any other failure reaches the error boundary (§7.7 #25).
    throwOnError: (error) => !(error instanceof ExamNotFoundError),
  })
  const batchId = exam.data?.batch_id
  const cells = useQuery({
    queryKey: ['exams', 'cells', id],
    queryFn: () => (batchId ? cellsFor(db, id, batchId) : Promise.resolve([] as ExamCell[])),
    enabled: batchId !== undefined,
  })
  const summary = useQuery({
    queryKey: ['exams', 'summary', id],
    queryFn: () => summaryFor(db, id),
    enabled: batchId !== undefined,
  })

  /** Sparse overrides only; the stored value is the fallback, so no effect is needed. */
  function draftFor(cell: ExamCell): string {
    return drafts[cell.studentId] ?? (cell.marks === null ? '' : String(cell.marks))
  }

  const save = useOptimisticMutation<
    ExamCell[],
    { studentId: string; marks: number | null; absent: boolean }
  >({
    mutationFn: ({ studentId, marks, absent }) => saveResult(db, id, studentId, marks, absent),
    queryKey: ['exams', 'cells', id],
    patch: (current, vars) =>
      (current ?? []).map((c) =>
        c.studentId === vars.studentId
          ? { ...c, marks: vars.marks, absent: vars.absent, remark: '' }
          : c,
      ),
  })

  if (exam.isPending) {
    return (
      <p role="status" className="p-8 text-sm">
        {t('common.loading')}
      </p>
    )
  }
  if (exam.isError || !exam.data) {
    return (
      <div role="alert" data-testid="exam-not-found" className="space-y-3 p-8">
        <p>{t('exams.notFound')}</p>
        <Button type="button" onClick={() => void exam.refetch()}>
          {t('exams.retry')}
        </Button>
      </div>
    )
  }

  async function persist(studentId: string, marks: number | null, absent: boolean) {
    setSaveState('saving')
    try {
      await save({ studentId, marks, absent })
      await Promise.all([cells.refetch(), summary.refetch()])
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
      toast.error(t('exams.saveFailed'))
    }
  }

  async function commitMarks(cell: ExamCell, index: number) {
    const raw = draftFor(cell).trim()
    const value = raw === '' ? null : Number(raw)
    const full = exam.data?.full_marks
    if (
      value !== null &&
      (!Number.isFinite(value) || value < 0 || (full !== undefined && value > full))
    ) {
      toast.error(t('exams.saveFailed'))
      return
    }
    // Blur follows Enter; do not write the same value twice or clobber a freshly saved cell.
    if (value !== cell.marks || cell.absent) {
      await persist(cell.studentId, value, false)
    }
    setFocused(index)
  }

  async function toggleAbsent(cell: ExamCell, index: number) {
    const next = !cell.absent
    await persist(cell.studentId, next ? null : cell.marks, next)
    setFocused(index)
  }

  function move(index: number, delta: number) {
    const list = cells.data ?? []
    if (list.length === 0) return
    const next = Math.min(list.length - 1, Math.max(0, index + delta))
    setFocused(next)
    rowRefs.current[next]?.focus()
  }

  function handleKeys(e: KeyboardEvent, cell: ExamCell, index: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      move(index, 1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      move(index, -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.currentTarget instanceof HTMLInputElement) void commitMarks(cell, index)
      else void toggleAbsent(cell, index)
    } else if (e.key === ' ') {
      e.preventDefault()
      void toggleAbsent(cell, index)
    }
  }

  const list = cells.data ?? []
  const average = summary.data?.average

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <h1 data-testid="exam-title" className="text-2xl font-semibold tracking-tight">
        {exam.data ? String(exam.data.name) : t('exams.title')}
      </h1>
      <p className="text-muted-foreground text-sm">{t('exams.gridHelp')}</p>

      <div className="flex flex-wrap items-center gap-3">
        <p data-testid="exam-summary" className="text-sm">
          {t('exams.average')}:{' '}
          <span data-testid="exam-average">
            {average === null || average === undefined ? t('exams.noAverage') : average}
          </span>
          {' · '}
          {t('exams.entered')}:{' '}
          <span data-testid="entered-count">{summary.data?.entered ?? 0}</span>
          {' · '}
          {t('exams.absent')}: <span data-testid="absent-count">{summary.data?.absent ?? 0}</span>
        </p>
        <span data-testid="save-state" className="sr-only">
          {saveState}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('exams.noRoster')}</p>
      ) : (
        <div role="grid" aria-label={t('exams.title')} className="overflow-x-auto">
          <div role="row" className="sr-only">
            <span role="columnheader">{t('exams.student')}</span>
            <span role="columnheader">{t('exams.marks')}</span>
            <span role="columnheader">{t('exams.absent')}</span>
          </div>
          {list.map((cell, index) => (
            <div
              role="row"
              key={cell.studentId}
              className="flex items-center justify-between gap-3 border-b py-2 text-sm"
            >
              <span role="gridcell" data-testid="student-name">
                {cell.studentName} <span className="text-muted-foreground">{cell.studentNo}</span>
              </span>
              <div role="gridcell" className="flex items-center gap-2">
                {cell.absent ? (
                  <span data-testid="absent-cell" className="rounded border px-3 py-1 font-medium">
                    A
                  </span>
                ) : (
                  <input
                    ref={(el) => {
                      if (!cell.absent) rowRefs.current[index] = el
                    }}
                    type="number"
                    step="any"
                    min="0"
                    data-testid="marks-input"
                    aria-label={`${cell.studentName}: ${t('exams.marks')}`}
                    className="border-input bg-background w-20 rounded border px-2 py-1 text-right"
                    value={draftFor(cell)}
                    tabIndex={!cell.absent && focused === index ? 0 : -1}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [cell.studentId]: e.target.value }))
                    }
                    onBlur={() => void commitMarks(cell, index)}
                    onKeyDown={(e) => handleKeys(e, cell, index)}
                  />
                )}
                <button
                  ref={(el) => {
                    if (cell.absent) rowRefs.current[index] = el
                  }}
                  type="button"
                  data-testid="absent-toggle"
                  aria-pressed={cell.absent}
                  aria-label={`${cell.studentName}: ${t(cell.absent ? 'exams.present' : 'exams.absent')}`}
                  tabIndex={cell.absent && focused === index ? 0 : -1}
                  className="rounded border px-2 py-1"
                  onClick={() => void toggleAbsent(cell, index)}
                  onKeyDown={(e) => handleKeys(e, cell, index)}
                >
                  {cell.absent ? t('exams.present') : t('exams.absent')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
