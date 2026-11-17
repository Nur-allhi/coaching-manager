/**
 * Recent payments with edit and void (T-052, D-048). Receipt number and status live on the row;
 * this component only edits the amount/date/method/note, re-runs allocation in the service and
 * shows the REVISED / VOID receipt markers. No SQL, no nested form (the collect form owns one).
 */
import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import type { Row } from '@/core/db/repository'
import { formatMinor, parseToMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  editPayment,
  listRecordedPayments,
  voidPayment,
  type EditPaymentInput,
} from './payment-service'

const METHODS = ['cash', 'bank', 'mobile'] as const
const editFormSchema = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(METHODS),
  amountMinor: z.number().int().positive(),
  note: z.string(),
})

export function RecentPayments() {
  const { t } = useTranslation()
  const db = getDb()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [amountText, setAmountText] = useState('')
  const [error, setError] = useState('')
  const list = useQuery({
    queryKey: ['payments', 'recorded'],
    queryFn: () => listRecordedPayments(db),
  })
  const form = useForm<EditPaymentInput>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { paidOn: '', method: 'cash', amountMinor: 0, note: '' },
  })

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payments', 'recorded'] }),
      qc.invalidateQueries({ queryKey: ['payments', 'dues'] }),
    ])
  }

  function startEdit(row: Row) {
    setError('')
    setEditingId(String(row.id))
    const amount = Number(row.amount_minor)
    const methodValue = String(row.method)
    setAmountText(formatMinor(amount))
    form.reset({
      paidOn: String(row.paid_on),
      method: METHODS.find((m) => m === methodValue) ?? 'cash',
      amountMinor: amount,
      note: row.note === null ? '' : String(row.note),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  async function saveEdit(values: EditPaymentInput) {
    if (editingId === null) return
    setError('')
    try {
      const row = list.data?.find((item) => String(item.id) === editingId)
      await editPayment(
        db,
        editingId,
        { ...values, amountMinor: parseToMinor(amountText) },
        Number(row?.version ?? 0),
      )
      setEditingId(null)
      await refresh()
    } catch {
      setError(t('payments.editFailed'))
    }
  }

  async function voidIt(row: Row) {
    setError('')
    setEditingId(null)
    try {
      await voidPayment(db, String(row.id), Number(row.version))
      await refresh()
    } catch {
      setError(t('payments.voidFailed'))
    }
  }

  return (
    <section data-testid="recent-payments" className="space-y-2 rounded-md border p-3">
      <h2 className="font-medium">{t('payments.recent')}</h2>
      {list.isPending && <p role="status">{t('common.loading')}</p>}
      {list.isError && <p role="alert">{t('payments.loadFailed')}</p>}
      {list.isSuccess && list.data.length === 0 && (
        <p className="text-muted-foreground">{t('payments.noPayments')}</p>
      )}
      {list.data?.map((row) => {
        const isVoid = String(row.status) === 'void'
        const revision = Number(row.revision ?? 0)
        const id = String(row.id)
        return (
          <div
            key={id}
            data-testid="payment-row"
            data-payment-id={id}
            className="space-y-2 border-t pt-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span data-testid="row-receipt" className="font-medium">
                {String(row.receipt_no)}
              </span>
              <span className="oc-num">{formatMinor(Number(row.amount_minor))}</span>
              <span data-testid="row-marker" className="text-destructive font-medium">
                {isVoid
                  ? t('payments.voided')
                  : revision > 0
                    ? t('payments.revised', { count: revision })
                    : ''}
              </span>
              <span className="space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="payment-view-receipt"
                  onClick={() => setViewingId(viewingId === id ? null : id)}
                >
                  {t('payments.receipt')}
                </Button>
                {!isVoid && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="payment-edit"
                      onClick={() => startEdit(row)}
                    >
                      {t('payments.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      data-testid="payment-void"
                      onClick={() => void voidIt(row)}
                    >
                      {t('payments.void')}
                    </Button>
                  </>
                )}
              </span>
            </div>

            {viewingId === id && (
              <div data-testid="receipt-preview" className="bg-card rounded border p-3">
                <p data-testid="receipt-number" className="font-medium">
                  {String(row.receipt_no)}
                </p>
                <p>
                  {t('payments.paidOn')}: {String(row.paid_on)}
                </p>
                <p>
                  {t('payments.amount')}: {formatMinor(Number(row.amount_minor))}
                </p>
                <p>
                  {t('payments.method')}: {t(`payments.methods.${String(row.method)}`)}
                </p>
                {isVoid && (
                  <p data-testid="receipt-void" className="text-destructive font-semibold">
                    {t('payments.voided')}
                  </p>
                )}
                {revision > 0 && (
                  <>
                    <p data-testid="receipt-revised" className="font-semibold">
                      {t('payments.revised', { count: revision })}
                    </p>
                    <p data-testid="receipt-revision">
                      {t('payments.revisionCount', { count: revision })}
                    </p>
                  </>
                )}
              </div>
            )}

            {editingId === id && (
              <div
                data-testid="payment-edit-form"
                className="grid gap-3 rounded border p-3 sm:grid-cols-2"
              >
                <div className="space-y-1">
                  <Label htmlFor="edit-amount">{t('payments.amount')}</Label>
                  <Input
                    id="edit-amount"
                    data-testid="edit-amount"
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
                  <Label htmlFor="edit-date">{t('payments.paidOn')}</Label>
                  <Input
                    id="edit-date"
                    data-testid="edit-date"
                    type="date"
                    {...form.register('paidOn')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-method">{t('payments.method')}</Label>
                  <select
                    id="edit-method"
                    data-testid="edit-method"
                    className="border-input h-9 w-full rounded-md border px-2 text-sm"
                    {...form.register('method')}
                  >
                    {METHODS.map((method) => (
                      <option key={method} value={method}>
                        {t(`payments.methods.${method}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-note">{t('payments.note')}</Label>
                  <Input id="edit-note" data-testid="edit-note" {...form.register('note')} />
                </div>
                <div className="flex items-end gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    data-testid="edit-save"
                    onClick={() => void form.handleSubmit((values) => void saveEdit(values))()}
                  >
                    {t('payments.saveEdit')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="edit-cancel"
                    onClick={cancelEdit}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <p data-testid="payment-edit-error" role="alert" className="text-destructive text-sm">
        {error}
      </p>
    </section>
  )
}
