import { lazy } from 'react'
import { BarChart3 } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const reportsModule: AppModule = {
  id: 'reports',
  nav: { label: 'Reports', icon: BarChart3, order: 9, path: '/reports' },
  permissions: ['reports.read'],
  routes: [
    {
      path: '/reports',
      title: 'Reports',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
