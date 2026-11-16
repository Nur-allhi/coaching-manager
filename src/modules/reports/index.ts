import { lazy } from 'react'
import { BarChart3 } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const reportsModule: AppModule = {
  id: 'reports',
  nav: { labelKey: 'nav.reports', icon: BarChart3, order: 9, path: '/reports' },
  permissions: ['reports.read'],
  routes: [
    {
      path: '/reports',
      titleKey: 'nav.reports',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
