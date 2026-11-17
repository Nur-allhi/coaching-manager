/**
 * Collect a payment (T-051, D-047 D1). Student, amount and method in; live dues preview and a
 * committed receipt number out. All allocation and receipt numbering happens in the service.
 */
import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { listStudents } from '@/modules/students'
import { getDb } from '@/core/db/client'
import { formatMinor, parseToMinor } from '@/core/money/money'
import { today } from '@/core/dates/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { duesForStudent, recordPayment, type PaymentInput } from './payment-service'
import { RecentPayments } from './RecentPayments'
import { receiptsForExport } from './receipt'
import { exportReceiptsExcel } from './receipt-export'

const PAYMENT_METHODS = ['cash', 'bank', 'mobile'] as const
const formSchema = z.object({
  studentId: z.string().min(1),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(PAYMENT_METHODS),
  amountMinor: z.number().int().positive(),
  note: z.string(),
})

export function PaymentsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const qc = useQueryClient()
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [amountText, setAmountText] = useState('')
  const form = useForm<PaymentInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { studentId: '', paidOn: today(), method: 'cash', amountMinor: 0, note: '' },
  })
  const studentId = useWatch({ control: form.control, name: 'studentId' })

  const students = useQuery({ queryKey: ['students', 'all'], queryFn: () => listStudents(db) })
  const dues = useQuery({
    queryKey: ['payments', 'dues', studentId],
    queryFn: () => duesForStudent(db, studentId),
    enabled: studentId !== '',
  })

  async function submit(values: PaymentInput) {
    setError('')
    setReceipt('')
    try {
      const result = await recordPayment(db, { ...values, amountMinor: parseToMinor(amountText) })
      setReceipt(result.receiptNo)
      setAmountText('')
      form.setValue('amountMinor', 0)
      await Promise.all([
        dues.refetch(),
        qc.invalidateQueries({ queryKey: ['payments', 'recorded'] }),
      ])
    } catch {
      setError(t('payments.saveFailed'))
    }
  }

  async function exportReceipts() {
    setExporting(true)
    setError('')
    try {
      await exportReceiptsExcel(await receiptsForExport(db))
    } catch {
      setError(t('payments.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.payments')}</h1>
        <Button
          type="button"
          variant="outline"
          data-testid="receipt-export"
          disabled={exporting}
          onClick={() => void exportReceipts()}
        >
          {t('payments.exportExcel')}
        </Button>
      </div>
      {receipt && (
        <p data-testid="payment-receipt" role="status" className="font-medium">
          {t('payments.receipt')}: {receipt}
        </p>
      )}

      <form onSubmit={form.handleSubmit((values) => void submit(values))} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="pay-student">{t('payments.student')}</Label>
          <select
            id="pay-student"
            data-testid="pay-student"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            {...form.register('studentId')}
          >
            <option value="">—</option>
            {(students.data ?? []).map((student) => (
              <option key={String(student.id)} value={String(student.id)}>
                {String(student.full_name)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pay-date">{t('payments.paidOn')}</Label>
            <Input id="pay-date" data-testid="pay-date" type="date" {...form.register('paidOn')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-method">{t('payments.method')}</Label>
            <select
              id="pay-method"
              data-testid="pay-method"
              className="border-input h-9 w-full rounded-md border px-2 text-sm"
              {...form.register('method')}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`payments.methods.${method}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pay-amount">{t('payments.amount')}</Label>
          <Input
            id="pay-amount"
            data-testid="pay-amount"
            inputMode="decimal"
            value={amountText}
            onChange={(event) => {
              const text = event.target.value
              setAmountText(text)
              try {
                form.setValue('amountMinor', parseToMinor(text))
              } catch {
                form.setValue('amountMinor', 0)
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pay-note">{t('payments.note')}</Label>
          <Input id="pay-note" data-testid="pay-note" {...form.register('note')} />
        </div>

        <section data-testid="payment-dues" className="rounded-md border p-3 text-sm">
          <h2 className="font-medium">{t('payments.dues')}</h2>
          {dues.isPending && <p role="status">{t('common.loading')}</p>}
          {dues.isError && <p role="alert">{t('payments.loadFailed')}</p>}
          {dues.isSuccess && dues.data.charges.length === 0 && (
            <p className="text-muted-foreground">{t('payments.noDues')}</p>
          )}
          {dues.data?.charges.map((charge) => (
            <div key={charge.id} data-testid="dues-row" className="flex justify-between py-1">
              <span>{charge.month ?? t('payments.admission')}</span>
              <span className="oc-num">{formatMinor(charge.netDueMinor)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>{t('payments.totalDue')}</span>
            <span data-testid="dues-total" className="oc-num">
              {formatMinor(dues.data?.totalDueMinor ?? 0)}
            </span>
          </div>
        </section>

        <p data-testid="payment-error" role="alert" className="text-destructive text-sm">
          {error}
        </p>
        <Button type="submit" data-testid="payment-save">
          {t('payments.take')}
        </Button>
      </form>

      <RecentPayments />
    </div>
  )
}
