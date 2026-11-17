import { lazy } from 'react'
import { Wallet } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public surface for payment recording and dues (TAD.md §2). */
export { recordPayment, duesForStudent, listRecordedPayments } from './payment-service'
export { generateCharges, listGeneratedCharges } from './service'

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
  ],
}
