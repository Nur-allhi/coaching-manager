/**
 * Payments tab for the student profile (T-053, D-049 C1). Lives in the payments module so it owns
 * payment data and receipt display; the profile only supplies the student id (TAD.md §2).
 */
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { formatMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { studentPaymentHistory } from './dues-service'

export function StudentPaymentsTab({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const db = getDb()
  const history = useQuery({
    queryKey: ['payments', 'student-history', studentId],
    queryFn: () => studentPaymentHistory(db, studentId),
    enabled: studentId !== '',
  })

  if (history.isPending) return <p role="status">{t('common.loading')}</p>
  if (history.isError) {
    return (
      <div role="alert" className="space-y-3">
        <p>{t('payments.loadFailed')}</p>
        <Button type="button" onClick={() => void history.refetch()}>
          {t('students.retry')}
        </Button>
      </div>
    )
  }
  if (!history.data) return null

  const { payments, dues } = history.data

  return (
    <section data-testid="profile-payments-content" className="space-y-4">
      <p data-testid="profile-dues-total" className="text-lg font-medium">
        {t('payments.totalDue')}: <span className="oc-num">{formatMinor(dues.totalDueMinor)}</span>
      </p>

      {dues.charges.length > 0 && (
        <div data-testid="profile-dues-list" className="rounded-md border">
          <div className="grid grid-cols-[1fr_6rem] gap-2 border-b p-2 text-sm font-medium">
            <span>{t('payments.column.month')}</span>
            <span className="text-right">{t('payments.column.due')}</span>
          </div>
          {dues.charges.map((charge) => (
            <div
              key={charge.id}
              data-testid="profile-dues-row"
              className="grid grid-cols-[1fr_6rem] gap-2 border-b px-2 py-1 text-sm"
            >
              <span>{charge.month ?? t('payments.admission')}</span>
              <span className="oc-num text-right">{formatMinor(charge.netDueMinor)}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-medium">{t('payments.history')}</h3>
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('payments.noPayments')}</p>
      ) : (
        <div data-testid="profile-payment-history" className="rounded-md border">
          {payments.map((row) => {
            const isVoid = String(row.status) === 'void'
            const revision = Number(row.revision ?? 0)
            return (
              <div
                key={String(row.id)}
                data-testid="profile-payment-row"
                className="flex flex-wrap items-center justify-between gap-2 border-b px-2 py-2 text-sm"
              >
                <span className="font-medium">{String(row.receipt_no)}</span>
                <span>{String(row.paid_on)}</span>
                <span className="oc-num">{formatMinor(Number(row.amount_minor))}</span>
                <span>{t(`payments.methods.${String(row.method)}`)}</span>
                <span data-testid="profile-payment-marker" className="text-destructive font-medium">
                  {isVoid
                    ? t('payments.voided')
                    : revision > 0
                      ? t('payments.revised', { count: revision })
                      : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
