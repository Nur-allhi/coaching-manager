import { lazy } from 'react'
import { Wallet } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const paymentsModule: AppModule = {
  id: 'payments',
  nav: { label: 'Payments', icon: Wallet, order: 5, path: '/payments' },
  permissions: ['payments.read'],
  routes: [
    {
      path: '/payments',
      title: 'Payments',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
