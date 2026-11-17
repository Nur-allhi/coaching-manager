import { lazy } from 'react'
import { Wallet } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public surface for payment recording, editing, voiding and dues (TAD.md §2). */
export {
  recordPayment,
  editPayment,
  voidPayment,
  duesForStudent,
  listRecordedPayments,
} from './payment-service'
export { generateCharges, listGeneratedCharges } from './service'
export { duesReport, studentPaymentHistory } from './dues-service'
export { receiptForPrint, receiptsForExport } from './receipt'
export { StudentPaymentsTab } from './StudentPaymentsTab'

export const paymentsModule: AppModule = {
  id: 'payments',
  nav: { labelKey: 'nav.payments', icon: Wallet, order: 5, path: '/payments' },
  permissions: ['payments.read'],
  routes: [
    {
      path: '/payments',
      titleKey: 'nav.payments',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
    {
      path: '/payments/dues',
      titleKey: 'payments.dues',
      component: lazy(() => import('./DuesScreen').then((mod) => ({ default: mod.DuesScreen }))),
    },
    {
      path: '/print/receipt/:paymentId',
      titleKey: 'payments.printTitle',
      component: lazy(() =>
        import('./ReceiptPrint').then((mod) => ({ default: mod.ReceiptPrint })),
      ),
    },
  ],
}
