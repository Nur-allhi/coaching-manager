/**
 * Attendance grid (T-060, D-051 C1). Roving-tabindex ARIA grid: one cell is tabbable, arrow keys
 * move focus, Enter/Space toggles status, Tab leaves the grid. Every toggle is a real audited save.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDb } from '@/core/db/client'
import { toast } from 'sonner'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import type { AttendanceCell, AttendanceSummary } from './types'
import { cellsFor, ensureSession, markAll, setStatus, summaryFor } from './service'

export function AttendanceGrid() {
  const { t } = useTranslation()
  const db = getDb()
  const { batchId = '', heldOn = '' } = useParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [focused, setFocused] = useState(0)
  const [saveState, setSaveState] = useState('')
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    let active = true
    void ensureSession(db, batchId, heldOn).then((id) => {
      if (active) setSessionId(id)
    })
    return () => {
      active = false
    }
  }, [db, batchId, heldOn])

  const cells = useQuery({
    queryKey: ['attendance', 'cells', sessionId],
    queryFn: () =>
      sessionId ? cellsFor(db, sessionId, batchId) : Promise.resolve([] as AttendanceCell[]),
    enabled: sessionId !== null,
  })
  const summary = useQuery({
    queryKey: ['attendance', 'summary', sessionId],
    queryFn: () =>
      sessionId
        ? summaryFor(db, sessionId)
        : Promise.resolve({ present: 0, absent: 0, total: 0, percentage: 0 } as AttendanceSummary),
    enabled: sessionId !== null,
  })

  const refresh = async () => {
    await Promise.all([cells.refetch(), summary.refetch()])
  }

  const toggle = useOptimisticMutation<
    AttendanceCell[],
    { studentId: string; status: 'present' | 'absent' }
  >({
    mutationFn: async ({ studentId, status }) => {
      if (!sessionId) return
      await setStatus(db, sessionId, studentId, status)
    },
    queryKey: ['attendance', 'cells', sessionId],
    patch: (current, vars) =>
      (current ?? []).map((c) =>
        c.studentId === vars.studentId ? { ...c, status: vars.status } : c,
      ),
  })

  const markAllMutation = useOptimisticMutation<AttendanceCell[], void>({
    mutationFn: async () => {
      if (!sessionId) return
      await markAll(db, sessionId)
    },
    queryKey: ['attendance', 'cells', sessionId],
    patch: (current) => (current ?? []).map((c) => ({ ...c, status: 'present' as const })),
  })

  async function onToggle(cell: AttendanceCell, index: number) {
    const next = cell.status === 'present' ? 'absent' : 'present'
    setSaveState('saving')
    try {
      await toggle({ studentId: cell.studentId, status: next })
      await refresh()
      setSaveState('saved')
    } catch {
      setSaveState('error')
      toast.error(t('attendance.saveFailed'))
    }
    setFocused(index)
  }

  async function onMarkAll() {
    setSaveState('saving')
    try {
      await markAllMutation()
      await refresh()
      setSaveState('saved')
    } catch {
      setSaveState('error')
      toast.error(t('attendance.saveFailed'))
    }
  }

  function move(delta: number) {
    const list = cells.data ?? []
    if (list.length === 0) return
    const next = Math.min(list.length - 1, Math.max(0, focused + delta))
    setFocused(next)
    cellRefs.current[next]?.focus()
  }

  const list = cells.data ?? []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('attendance.sessionTitle')}</h1>
      <p className="text-muted-foreground text-sm">{t('attendance.gridHelp')}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="mark-all-present"
          className="rounded border px-3 py-2 text-sm"
          disabled={sessionId === null}
          onClick={() => void onMarkAll()}
        >
          {t('attendance.markAllPresent')}
        </button>
        <span data-testid="save-state" className="sr-only">
          {saveState}
        </span>
        <p data-testid="attendance-summary" className="text-sm">
          {t('attendance.percentage')}:{' '}
          <span data-testid="attendance-percentage">{summary.data?.percentage ?? 0}%</span>
          {' · '}
          {t('attendance.presentCount')}:{' '}
          <span data-testid="present-count">{summary.data?.present ?? 0}</span>
          {' · '}
          {t('attendance.absentCount')}:{' '}
          <span data-testid="absent-count">{summary.data?.absent ?? 0}</span>
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('attendance.noRoster')}</p>
      ) : (
        <div role="grid" aria-label={t('attendance.sessionTitle')} className="overflow-x-auto">
          <div role="row" className="sr-only">
            <span role="columnheader">{t('attendance.student')}</span>
            <span role="columnheader">{t('attendance.status')}</span>
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
              <button
                ref={(el) => {
                  cellRefs.current[index] = el
                }}
                role="gridcell"
                aria-label={`${cell.studentName}: ${t(cell.status === 'present' ? 'attendance.present' : 'attendance.absent')}`}
                data-testid="status-cell"
                data-status={cell.status}
                tabIndex={focused === index ? 0 : -1}
                className="rounded border px-3 py-1"
                onClick={() => void onToggle(cell, index)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault()
                    move(1)
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    move(-1)
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void onToggle(cell, index)
                  }
                }}
              >
                {t(cell.status === 'present' ? 'attendance.present' : 'attendance.absent')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
