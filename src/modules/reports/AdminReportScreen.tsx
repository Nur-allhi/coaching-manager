/**
 * Admin report screen (T-073, D-059 A1/B1). Eight sections over one monthly or academic-year range,
 * printable on A4 and exportable to Excel. Read model only (TAD §2 rule 3).
 */
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { today } from '@/core/dates/dates'
import { formatMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { exportAdminExcel, type AdminLabels } from './admin-export'
import { academicYearOptions, adminReport, type AdminScope } from './queries/admin'
import './admin.css'

function Section({
  title,
  testId,
  children,
}: {
  title: string
  testId: string
  children: ReactNode
}) {
  return (
    <section data-testid={testId} className="space-y-1 rounded border p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function AdminReportScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const [scope, setScope] = useState<AdminScope>({
    kind: 'month',
    month: today().slice(0, 7),
  })
  const years = useQuery({ queryKey: ['admin', 'years'], queryFn: () => academicYearOptions(db) })
  const selectedYear =
    scope.kind === 'year' && scope.academicYearId === '' && years.data?.[0]?.id
      ? ({ kind: 'year', academicYearId: years.data[0].id } as AdminScope)
      : scope
  const report = useQuery({
    queryKey: ['admin', 'report', selectedYear],
    queryFn: () => adminReport(db, selectedYear),
    enabled: !(selectedYear.kind === 'year' && selectedYear.academicYearId === ''),
  })

  const labels: AdminLabels = {
    range: t('admin.range'),
    from: t('admin.from'),
    to: t('admin.to'),
    admissions: t('admin.admissions'),
    total: t('admin.total'),
    className: t('admin.className'),
    batchName: t('admin.batchName'),
    dropouts: t('admin.dropouts'),
    collected: t('admin.collected'),
    dues: t('admin.dues'),
    methodSplit: t('admin.methodSplit'),
    attendanceRate: t('admin.attendanceRate'),
    topPerformers: t('admin.topPerformers'),
    net: t('admin.net'),
    section: t('admin.section'),
    detail: t('admin.detail'),
    value: t('admin.value'),
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 data-testid="admin-title" className="text-2xl font-semibold tracking-tight">
          {t('admin.title')}
        </h1>
        <div data-print-hide className="flex gap-2">
          <Button type="button" data-testid="admin-print" onClick={() => window.print()}>
            {t('admin.print')}
          </Button>
          <Button
            type="button"
            data-testid="admin-export"
            disabled={!report.data}
            onClick={() => {
              if (report.data) void exportAdminExcel(report.data, labels, 'admin-report.xlsx')
            }}
          >
            {t('admin.exportExcel')}
          </Button>
        </div>
      </div>

      <div data-print-hide className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm" htmlFor="admin-scope">
          <span className="block">{t('admin.scope')}</span>
          <select
            id="admin-scope"
            data-testid="admin-scope"
            className="border-input bg-background rounded border px-2 py-1"
            value={scope.kind}
            onChange={(event) =>
              setScope(
                event.target.value === 'month'
                  ? { kind: 'month', month: today().slice(0, 7) }
                  : { kind: 'year', academicYearId: years.data?.[0]?.id ?? '' },
              )
            }
          >
            <option value="month">{t('admin.month')}</option>
            <option value="year">{t('admin.year')}</option>
          </select>
        </label>
        {scope.kind === 'month' ? (
          <label className="space-y-1 text-sm" htmlFor="admin-month">
            <span className="block">{t('admin.month')}</span>
            <input
              id="admin-month"
              data-testid="admin-month"
              type="month"
              className="border-input bg-background rounded border px-2 py-1"
              value={scope.month}
              onChange={(event) => setScope({ kind: 'month', month: event.target.value })}
            />
          </label>
        ) : (
          <label className="space-y-1 text-sm" htmlFor="admin-year">
            <span className="block">{t('admin.year')}</span>
            <select
              id="admin-year"
              data-testid="admin-year"
              className="border-input bg-background rounded border px-2 py-1"
              value={selectedYear.kind === 'year' ? selectedYear.academicYearId : ''}
              onChange={(event) => setScope({ kind: 'year', academicYearId: event.target.value })}
            >
              {years.data?.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {report.isPending ? (
        <p role="status" className="text-sm">
          {t('admin.loading')}
        </p>
      ) : report.isError || !report.data ? (
        <div role="alert" className="text-sm">
          {t('admin.error')}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Section title={t('admin.range')} testId="admin-range-section">
            <p className="text-sm">
              {t('admin.from')}: {report.data.from} · {t('admin.to')}: {report.data.to}
            </p>
          </Section>
          <Section title={t('admin.admissions')} testId="admin-admissions">
            <p data-testid="admin-admissions-total" className="text-sm">
              {t('admin.total')}: {report.data.admissions}
            </p>
            {report.data.admissionsByClass.map((row) => (
              <p key={`class-${row.name}`} className="text-sm">
                {t('admin.className')} {row.name}: {row.count}
              </p>
            ))}
            {report.data.admissionsByBatch.map((row) => (
              <p key={`batch-${row.name}`} className="text-sm">
                {t('admin.batchName')} {row.name}: {row.count}
              </p>
            ))}
          </Section>
          <Section title={t('admin.dropouts')} testId="admin-dropouts">
            <p data-testid="admin-dropouts-total" className="text-sm">
              {t('admin.total')}: {report.data.dropouts}
            </p>
          </Section>
          <Section title={t('admin.collected')} testId="admin-collected">
            <p data-testid="admin-collected-total" className="text-sm">
              {t('admin.total')}: {formatMinor(report.data.collectedMinor)}
            </p>
          </Section>
          <Section title={t('admin.dues')} testId="admin-dues">
            <p data-testid="admin-dues-total" className="text-sm">
              {t('admin.total')}: {formatMinor(report.data.dueMinor)}
            </p>
          </Section>
          <Section title={t('admin.methodSplit')} testId="admin-methods">
            {report.data.methodSplit.map((row) => (
              <p key={row.method} className="text-sm">
                {row.method}: {formatMinor(row.amountMinor)}
              </p>
            ))}
          </Section>
          <Section title={t('admin.attendanceRate')} testId="admin-attendance">
            <p data-testid="admin-attendance-rate" className="text-sm">
              {report.data.attendanceRate === null ? '—' : `${report.data.attendanceRate}%`}
            </p>
          </Section>
          <Section title={t('admin.topPerformers')} testId="admin-toppers">
            {report.data.topPerformers.map((row) => (
              <p key={row.name} className="text-sm">
                {row.name}: {row.marks}
              </p>
            ))}
          </Section>
          <Section title={t('admin.net')} testId="admin-net">
            <p data-testid="admin-net-total" className="text-sm">
              {t('admin.total')}: {formatMinor(report.data.netMinor)}
            </p>
          </Section>
        </div>
      )}
    </div>
  )
}
