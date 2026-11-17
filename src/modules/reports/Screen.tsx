/**
 * Reports framework screen (T-071, D-057). One registry of report definitions; the filter bar,
 * preview, print view and both exports all use the same filtered rows. Read model only (TAD §2 #3).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { Button } from '@/components/ui/button'
import { listBatches, listClasses } from '@/modules/academics'
import { downloadCsv, exportReportExcel, reportCsv } from './export'
import { getReport, reports } from './registry'
import type { ReportFilter } from './types'
import './reports.css'

const ALL: ReportFilter = { from: '2000-01-01', to: '2100-12-31', batchId: '', classId: '' }

export function Screen() {
  const { t } = useTranslation()
  const db = getDb()
  const [reportId, setReportId] = useState(reports[0]?.id ?? '')
  const [filter, setFilter] = useState<ReportFilter>(ALL)
  const report = getReport(reportId)

  const options = useQuery({
    queryKey: ['reports', 'options'],
    queryFn: async () => {
      const [batches, classes] = await Promise.all([listBatches(db), listClasses(db)])
      return { batches, classes }
    },
  })
  const rows = useQuery({
    queryKey: ['reports', 'rows', reportId, filter],
    queryFn: () => (report ? report.load(db, filter) : Promise.resolve([])),
    enabled: report !== undefined,
  })

  const columns = report?.columns ?? []
  const labels: Record<string, string> = {}
  for (const column of columns) labels[column.labelKey] = t(column.labelKey)
  const data = rows.data ?? []

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 data-testid="reports-title" className="text-2xl font-semibold tracking-tight">
          {t('reports.title')}
        </h1>
        <Button type="button" data-print-hide onClick={() => window.print()}>
          {t('reports.print')}
        </Button>
      </div>

      <div data-print-hide className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">{t('reports.studentList')}</span>
          <select
            data-testid="report-select"
            className="border-input bg-background rounded border px-2 py-1"
            value={reportId}
            onChange={(event) => setReportId(event.target.value)}
          >
            {reports.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {t(entry.titleKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{t('reports.from')}</span>
          <input
            data-testid="report-from"
            type="date"
            className="border-input bg-background rounded border px-2 py-1"
            value={filter.from}
            onChange={(event) => setFilter((prev) => ({ ...prev, from: event.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{t('reports.to')}</span>
          <input
            data-testid="report-to"
            type="date"
            className="border-input bg-background rounded border px-2 py-1"
            value={filter.to}
            onChange={(event) => setFilter((prev) => ({ ...prev, to: event.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{t('reports.batch')}</span>
          <select
            data-testid="report-batch"
            className="border-input bg-background rounded border px-2 py-1"
            value={filter.batchId}
            onChange={(event) => setFilter((prev) => ({ ...prev, batchId: event.target.value }))}
          >
            <option value="">{t('reports.allBatches')}</option>
            {options.data?.batches.map((batch) => (
              <option key={String(batch.id)} value={String(batch.id)}>
                {batch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{t('reports.class')}</span>
          <select
            data-testid="report-class"
            className="border-input bg-background rounded border px-2 py-1"
            value={filter.classId}
            onChange={(event) => setFilter((prev) => ({ ...prev, classId: event.target.value }))}
          >
            <option value="">{t('reports.allClasses')}</option>
            {options.data?.classes.map((entry) => (
              <option key={String(entry.id)} value={String(entry.id)}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div data-print-hide className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="report-export-csv"
          disabled={rows.isPending || data.length === 0}
          onClick={() => downloadCsv(reportCsv(data, columns, labels), `${reportId}.csv`)}
        >
          {t('reports.exportCsv')}
        </Button>
        <Button
          type="button"
          data-testid="report-export-excel"
          disabled={rows.isPending || data.length === 0}
          onClick={() => void exportReportExcel(data, columns, labels, `${reportId}.xlsx`)}
        >
          {t('reports.exportExcel')}
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        {t('reports.rows')}: <span data-testid="report-row-count">{data.length}</span>
        {' · '}
        {t('reports.total')}:{' '}
        <span data-testid="report-total">{report?.total ? (report.total(data) ?? '—') : '—'}</span>
      </p>

      {options.isPending || rows.isPending ? (
        <p role="status" className="text-sm">
          {t('reports.loading')}
        </p>
      ) : rows.isError ? (
        <div role="alert" className="text-sm">
          {t('reports.error')}
        </div>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('reports.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="py-2 pr-3">
                    {t(column.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} data-testid="report-row" className="border-b">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-testid={`report-cell-${column.key}`}
                      className="py-2 pr-3"
                    >
                      {row[column.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
