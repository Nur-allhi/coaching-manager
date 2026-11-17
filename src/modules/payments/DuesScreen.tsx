/**
 * Defaulters report (T-053, D-049 B1). Batch, class and amount-range filters over the one dues
 * report; totals are the sum of exactly the rows shown. Virtualized so a large list stays usable.
 */
import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { formatMinor, parseToMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { duesReport, type DuesRow } from './dues-service'

function amount(text: string, fallback: number): number {
  if (text.trim() === '') return fallback
  try {
    return parseToMinor(text)
  } catch {
    return fallback
  }
}

export function DuesScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [batch, setBatch] = useState('')
  const [className, setClassName] = useState('')
  const [minText, setMinText] = useState('')
  const [maxText, setMaxText] = useState('')
  const report = useQuery({ queryKey: ['payments', 'dues-report'], queryFn: () => duesReport(db) })

  const rows = report.data ?? []
  const batches = useMemo(
    () => [...new Set(rows.map((row) => row.batchName).filter(Boolean))].sort(),
    [rows],
  )
  const classes = useMemo(
    () => [...new Set(rows.map((row) => row.className).filter(Boolean))].sort(),
    [rows],
  )
  const filtered = useMemo(() => {
    const min = amount(minText, 0)
    const max = amount(maxText, Number.MAX_SAFE_INTEGER)
    return rows.filter(
      (row) =>
        (batch === '' || row.batchName === batch) &&
        (className === '' || row.className === className) &&
        row.dueMinor >= min &&
        row.dueMinor <= max,
    )
  }, [rows, batch, className, minText, maxText])
  const total = filtered.reduce((sum, row) => sum + row.dueMinor, 0)

  const parentRef = useRef<HTMLDivElement>(null)
  // REPO_RULES §7.6 #19 mandates TanStack Virtual for lists that can fill a screen; its handle
  // is intentionally not memoizable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  const columns = ['studentNo', 'studentName', 'batch', 'class', 'due'] as const
  function label(column: (typeof columns)[number]): string {
    return t(`payments.column.${column}`)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('payments.duesTitle')}</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="dues-batch">{t('payments.filterBatch')}</Label>
          <select
            id="dues-batch"
            data-testid="filter-batch"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
          >
            <option value="">{t('payments.allBatches')}</option>
            {batches.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dues-class">{t('payments.filterClass')}</Label>
          <select
            id="dues-class"
            data-testid="filter-class"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          >
            <option value="">{t('payments.allClasses')}</option>
            {classes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dues-min">{t('payments.minAmount')}</Label>
          <Input
            id="dues-min"
            data-testid="filter-min"
            inputMode="decimal"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dues-max">{t('payments.maxAmount')}</Label>
          <Input
            id="dues-max"
            data-testid="filter-max"
            inputMode="decimal"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
          />
        </div>
      </div>

      <p data-testid="dues-report-total" className="text-lg font-medium">
        {t('payments.reportTotal')}: <span className="oc-num">{formatMinor(total)}</span>
      </p>

      {report.isPending && <p role="status">{t('common.loading')}</p>}
      {report.isError && (
        <div role="alert" className="space-y-3">
          <p>{t('payments.loadFailed')}</p>
          <Button type="button" onClick={() => void report.refetch()}>
            {t('students.retry')}
          </Button>
        </div>
      )}
      {report.isSuccess && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm">{t('payments.noDefaulters')}</p>
      )}

      {filtered.length > 0 && (
        <div data-testid="dues-report" className="overflow-x-auto rounded-md border">
          <div className="grid grid-cols-[5rem_minmax(0,1fr)_4rem_4rem_4rem] gap-2 border-b p-2 text-sm font-medium">
            {columns.map((column) => (
              <span key={column} className="truncate">
                {label(column)}
              </span>
            ))}
          </div>
          <div ref={parentRef} className="h-96 overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((item) => {
                const row: DuesRow | undefined = filtered[item.index]
                if (!row) return null
                return (
                  <div
                    key={row.studentId}
                    data-testid="dues-row"
                    data-batch={row.batchName}
                    data-class={row.className}
                    data-due={row.dueMinor}
                    className="absolute inset-x-0 grid grid-cols-[5rem_minmax(0,1fr)_4rem_4rem_4rem] items-center gap-2 border-b px-2 text-sm"
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    <span className="truncate">{row.studentNo}</span>
                    <Link to={`/students/${row.studentId}`} className="truncate underline">
                      {row.studentName}
                    </Link>
                    <span className="truncate">{row.batchName || '—'}</span>
                    <span className="truncate">{row.className || '—'}</span>
                    <span className="oc-num">{formatMinor(row.dueMinor)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
