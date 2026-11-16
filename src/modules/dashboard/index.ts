import { lazy } from 'react'
import { LayoutDashboard } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const dashboardModule: AppModule = {
  id: 'dashboard',
  nav: { labelKey: 'nav.dashboard', icon: LayoutDashboard, order: 1, path: '/' },
  permissions: ['dashboard.read'],
  routes: [
    {
      path: '/',
      titleKey: 'nav.dashboard',
      component: lazy(() => import('./Screen').then((m) => ({ default: m.Screen }))),
    },
  ],
}
