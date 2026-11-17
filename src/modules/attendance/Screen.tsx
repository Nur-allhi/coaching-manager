/**
 * Attendance session picker (T-060). Choose a batch and date, then open the grid route at
 * /attendance/:batchId/:date. Batch list comes from the academics public surface.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDb } from '@/core/db/client'
import { today } from '@/core/dates/dates'
import { batchOptions } from './service'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function AttendancePicker() {
  const { t } = useTranslation()
  const db = getDb()
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState(() => today())
  const batches = useQuery({ queryKey: ['attendance', 'batches'], queryFn: () => batchOptions(db) })

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('attendance.sessionTitle')}</h1>
      <p className="text-muted-foreground text-sm">{t('attendance.picker')}</p>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="attendance-batch">{t('attendance.batch')}</Label>
          <select
            id="attendance-batch"
            data-testid="attendance-batch"
            className="border-input bg-background w-full rounded border px-3 py-2 text-sm"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            <option value="">—</option>
            {batches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="attendance-date">{t('attendance.date')}</Label>
          <Input
            id="attendance-date"
            data-testid="attendance-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button
          type="button"
          data-testid="attendance-open"
          disabled={batchId === '' || date === ''}
          onClick={() => navigate(`/attendance/${batchId}/${date}`)}
        >
          {t('attendance.open')}
        </Button>
      </div>
    </div>
  )
}

/** Default screen at /attendance — the picker. */
export function Screen() {
  return <AttendancePicker />
}
