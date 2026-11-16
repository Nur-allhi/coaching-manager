import { lazy } from 'react'
import { Wallet } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

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
