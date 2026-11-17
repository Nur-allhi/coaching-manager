/**
 * Dashboard screen (T-070, D-056). KPI cards link to the filtered list behind each number; values
 * come from the owning modules' public reads so they match those screens for the same data.
 */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getDb } from '@/core/db/client'
import { formatMinor } from '@/core/money/money'
import { dashboardData } from './service'
import type { Topper } from './types'

function Kpi({
  label,
  value,
  testId,
  to,
}: {
  label: string
  value: string | number
  testId: string
  to: string
}) {
  return (
    <Link to={to} data-testid={testId} className="block rounded border p-4 hover:underline">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </Link>
  )
}

export function Screen() {
  const { t } = useTranslation()
  const db = getDb()
  const query = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardData(db) })
  const data = query.data

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <h1 data-testid="dashboard-title" className="text-2xl font-semibold tracking-tight">
        {t('dashboard.title')}
      </h1>

      {query.isPending ? (
        <p role="status" className="p-8 text-sm">
          {t('dashboard.loading')}
        </p>
      ) : query.isError || !data ? (
        <div role="alert" className="p-8 text-sm">
          {t('dashboard.error')}
        </div>
      ) : (
        <>
          {data.backupStale && (
            <div
              role="status"
              data-testid="backup-stale-banner"
              className="rounded border border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950"
            >
              <strong>{t('dashboard.staleBackupTitle')}</strong> — {t('dashboard.staleBackupBody')}{' '}
              <Link to="/data-tools" data-testid="backup-banner-link" className="underline">
                {t('dashboard.openBackups')}
              </Link>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label={t('dashboard.collected')}
              value={formatMinor(data.collectedMinor)}
              testId="kpi-collected"
              to="/payments"
            />
            <Kpi
              label={t('dashboard.due')}
              value={formatMinor(data.dueMinor)}
              testId="kpi-due"
              to="/payments/dues"
            />
            <Kpi
              label={t('dashboard.admissions')}
              value={data.admissionsThisMonth}
              testId="kpi-admissions"
              to="/students"
            />
            <Kpi
              label={t('dashboard.activeStudents')}
              value={data.activeStudents}
              testId="kpi-active"
              to="/enrollments"
            />
            <Kpi
              label={t('dashboard.todaysBatches')}
              value={data.todaysBatches}
              testId="kpi-batches"
              to="/attendance"
            />
            <Kpi
              label={t('dashboard.lowAttendance')}
              value={data.lowAttendance}
              testId="kpi-low-attendance"
              to="/attendance"
            />
          </div>

          <section className="space-y-2" aria-labelledby="toppers-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="toppers-heading" className="text-lg font-medium">
                {t('dashboard.recentToppers')}
              </h2>
              <Link to="/leaderboard" data-testid="toppers-link" className="text-sm underline">
                {t('dashboard.recentToppers')}
              </Link>
            </div>
            {data.recentToppers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('dashboard.noToppers')}</p>
            ) : (
              <ul className="divide-y" data-testid="toppers-list">
                {data.recentToppers.map((topper: Topper, index: number) => (
                  <li key={`${topper.name}-${index}`} className="flex justify-between py-2 text-sm">
                    <span>{topper.name}</span>
                    <span className="font-medium">{topper.marks}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
