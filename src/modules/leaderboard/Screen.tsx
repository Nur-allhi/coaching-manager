/**
 * Leaderboard screen (T-063, D-055). Competition-ranked table over three scopes with batch/class
 * filters and a print view. Read-only: data comes from this module's queries folder (TAD §2 #3).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDb } from '@/core/db/client'
import { Button } from '@/components/ui/button'
import { listBatches, listClasses } from '@/modules/academics'
import { examOptions } from '@/modules/exams'
import { academicYearOptions, rankedLeaderboard } from './service'
import type { RankFilter, RankQuery, RankScope } from './types'
import './leaderboard.css'

function parseFilter(value: string): RankFilter {
  if (value.startsWith('batch:')) return { kind: 'batch', id: value.slice(6) }
  if (value.startsWith('class:')) return { kind: 'class', id: value.slice(6) }
  return { kind: 'all' }
}

export function Screen() {
  const { t } = useTranslation()
  const db = getDb()
  const [scope, setScope] = useState<RankScope>('exam')
  const [examId, setExamId] = useState('')
  const [month, setMonth] = useState('2026-03')
  const [academicYearId, setAcademicYearId] = useState('')
  const [filter, setFilter] = useState<RankFilter>({ kind: 'all' })

  const options = useQuery({
    queryKey: ['leaderboard', 'options'],
    queryFn: async () => {
      const [exams, batches, classes, years] = await Promise.all([
        examOptions(db),
        listBatches(db),
        listClasses(db),
        academicYearOptions(db),
      ])
      return { exams, batches, classes, years }
    },
  })

  const selectedExam = examId || options.data?.exams[0]?.id || ''
  const selectedYear = academicYearId || options.data?.years[0]?.id || ''
  const query: RankQuery | null =
    scope === 'exam' && !selectedExam
      ? null
      : scope === 'year' && !selectedYear
        ? null
        : {
            scope,
            examId: scope === 'exam' ? selectedExam : undefined,
            month: scope === 'month' ? month : undefined,
            academicYearId: scope === 'year' ? selectedYear : undefined,
            filter,
          }
  const rows = useQuery({
    queryKey: ['leaderboard', 'rows', query],
    queryFn: () => rankedLeaderboard(db, query as RankQuery),
    enabled: query !== null,
  })

  if (options.isPending) {
    return (
      <p role="status" className="p-8 text-sm">
        {t('leaderboard.loading')}
      </p>
    )
  }
  if (options.isError) {
    return (
      <div role="alert" className="p-8 text-sm">
        {t('leaderboard.error')}
      </div>
    )
  }

  const filterValue = filter.kind === 'all' ? 'all' : `${filter.kind}:${filter.id}`

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 data-testid="leaderboard-title" className="text-2xl font-semibold tracking-tight">
          {t('leaderboard.title')}
        </h1>
        <Button type="button" data-print-hide onClick={() => window.print()}>
          {t('leaderboard.print')}
        </Button>
      </div>

      <div data-print-hide className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm" htmlFor="leaderboard-scope">
          <span className="block">{t('leaderboard.scope')}</span>
          <select
            data-testid="leaderboard-scope"
            className="border-input bg-background rounded border px-2 py-1"
            value={scope}
            onChange={(event) => setScope(event.target.value as RankScope)}
          >
            <option value="exam">{t('leaderboard.exam')}</option>
            <option value="month">{t('leaderboard.month')}</option>
            <option value="year">{t('leaderboard.year')}</option>
          </select>
        </label>

        {scope === 'exam' && (
          <label className="space-y-1 text-sm" htmlFor="leaderboard-exam">
            <span className="block">{t('leaderboard.exam')}</span>
            <select
              data-testid="leaderboard-exam"
              className="border-input bg-background rounded border px-2 py-1"
              value={selectedExam}
              onChange={(event) => setExamId(event.target.value)}
            >
              {options.data?.exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} · {exam.heldOn}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope === 'month' && (
          <label className="space-y-1 text-sm" htmlFor="leaderboard-month">
            <span className="block">{t('leaderboard.month')}</span>
            <input
              data-testid="leaderboard-month"
              type="month"
              className="border-input bg-background rounded border px-2 py-1"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
        )}
        {scope === 'year' && (
          <label className="space-y-1 text-sm" htmlFor="leaderboard-year">
            <span className="block">{t('leaderboard.year')}</span>
            <select
              data-testid="leaderboard-year"
              className="border-input bg-background rounded border px-2 py-1"
              value={selectedYear}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              {options.data?.years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1 text-sm" htmlFor="leaderboard-filter">
          <span className="block">{t('leaderboard.filter')}</span>
          <select
            data-testid="leaderboard-filter"
            className="border-input bg-background rounded border px-2 py-1"
            value={filterValue}
            onChange={(event) => setFilter(parseFilter(event.target.value))}
          >
            <option value="all">{t('leaderboard.all')}</option>
            <optgroup label={t('leaderboard.batch')}>
              {options.data?.batches.map((batch) => (
                <option key={String(batch.id)} value={`batch:${String(batch.id)}`}>
                  {batch.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('leaderboard.class')}>
              {options.data?.classes.map((entry) => (
                <option key={String(entry.id)} value={`class:${String(entry.id)}`}>
                  {entry.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      {query === null ? (
        <p className="text-muted-foreground text-sm">
          {scope === 'exam' ? t('leaderboard.selectExam') : t('leaderboard.selectYear')}
        </p>
      ) : rows.isPending ? (
        <p role="status" className="text-sm">
          {t('leaderboard.loading')}
        </p>
      ) : rows.isError ? (
        <div role="alert" className="text-sm">
          {t('leaderboard.error')}
        </div>
      ) : rows.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('leaderboard.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2 pr-3">
                  {t('leaderboard.rank')}
                </th>
                <th scope="col" className="py-2 pr-3">
                  {t('leaderboard.student')}
                </th>
                <th scope="col" className="py-2 pr-3">
                  {t('leaderboard.batch')}
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  {t('leaderboard.total')}
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  {t('leaderboard.average')}
                </th>
                <th scope="col" className="py-2 text-right">
                  {t('leaderboard.absent')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((row) => (
                <tr key={row.studentId} data-testid="leaderboard-row" className="border-b">
                  <td data-testid="rank-value" className="py-2 pr-3 font-medium">
                    {row.rank}
                  </td>
                  <td className="py-2 pr-3">
                    {row.studentName} <span className="text-muted-foreground">{row.studentNo}</span>
                  </td>
                  <td className="py-2 pr-3">{row.batchName}</td>
                  <td data-testid="rank-total" className="py-2 pr-3 text-right">
                    {row.totalMarks}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {row.average === null ? '—' : row.average}
                  </td>
                  <td className="py-2 text-right">{row.absentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
