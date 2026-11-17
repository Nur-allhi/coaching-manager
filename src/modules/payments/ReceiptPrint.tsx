/**
 * A5 receipt print route (T-054, D-050). All values are escaped by React; the QR is generated from
 * the receipt number, and the Bangla centre line is marked `lang="bn"` so the self-hosted Bengali
 * family shapes its conjuncts both on screen and in print.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { formatMinor } from '@/core/money/money'
import { Button } from '@/components/ui/button'
import { receiptForPrint } from './receipt'
import './receipt.css'

export function ReceiptPrint() {
  const { t } = useTranslation()
  const db = getDb()
  const { paymentId = '' } = useParams()
  const [params] = useSearchParams()
  const [qr, setQr] = useState('')
  const receipt = useQuery({
    queryKey: ['payments', 'receipt', paymentId],
    queryFn: () => receiptForPrint(db, paymentId),
  })
  const receiptNo = receipt.data?.receiptNo

  useEffect(() => {
    if (!receiptNo) return
    let active = true
    void QRCode.toDataURL(receiptNo, { margin: 1, width: 160 })
      .then((url) => {
        if (active) setQr(url)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [receiptNo])

  if (receipt.isPending)
    return (
      <p role="status" className="p-8 text-sm">
        {t('common.loading')}
      </p>
    )
  if (receipt.isError || !receipt.data) {
    return (
      <p role="alert" className="p-8 text-sm">
        {t('payments.notFound')}
      </p>
    )
  }

  const data = receipt.data
  const isVoid = data.status === 'void'
  const isDuplicate = params.get('duplicate') === '1'
  const watermark = isVoid
    ? t('payments.voided')
    : isDuplicate
      ? t('payments.duplicate')
      : data.revision > 0
        ? t('payments.revised', { count: data.revision })
        : ''

  function row(label: string, value: string, testId: string) {
    return (
      <div data-testid={testId} className="receipt-row">
        <span>{label}</span>
        <span>{value}</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="receipt-actions mx-auto flex max-w-[148mm] justify-end pb-3">
        <Button type="button" data-testid="receipt-print" onClick={() => window.print()}>
          {t('payments.printAction')}
        </Button>
      </div>

      <article data-testid="receipt-page" className="receipt-page">
        {watermark && (
          <div data-testid="receipt-watermark" className="receipt-watermark">
            {watermark}
          </div>
        )}
        <header className="mb-4 text-center">
          {data.logoDataUri !== '' && (
            <img src={data.logoDataUri} alt="" className="mx-auto mb-2 h-16 w-16 object-contain" />
          )}
          <h1 className="text-xl font-semibold">{data.centreName}</h1>
          <p lang="bn" data-testid="receipt-centre-bn" className="text-sm">
            {t('payments.centreBn')}
          </p>
          <h2 className="mt-2 text-lg font-medium">{t('payments.printTitle')}</h2>
        </header>

        {row(t('payments.receipt'), data.receiptNo, 'receipt-no')}
        {row(t('payments.paidOn'), data.paidOn, 'receipt-date')}
        {row(t('payments.student'), data.studentName, 'receipt-student')}
        {row(t('payments.studentNo'), data.studentNo, 'receipt-student-no')}
        {row(t('payments.filterBatch'), data.batchName, 'receipt-batch')}
        {row(
          t('payments.printMonths'),
          data.months.map((month) => month ?? t('payments.admission')).join(', '),
          'receipt-months',
        )}
        {row(t('payments.amount'), formatMinor(data.amountMinor), 'receipt-amount')}
        {row(t('payments.method'), t(`payments.methods.${data.method}`), 'receipt-method')}
        {row(t('payments.printBalanceDue'), formatMinor(data.balanceDueMinor), 'receipt-balance')}

        <div className="mt-4 flex items-center justify-between gap-4">
          <div data-testid="receipt-qr">
            {qr !== '' && <img src={qr} alt={data.receiptNo} className="size-24" />}
          </div>
          <div data-testid="receipt-signature" className="receipt-signature flex-1">
            {t('payments.printSignature')}
          </div>
        </div>
      </article>
    </div>
  )
}
