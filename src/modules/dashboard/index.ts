import { lazy } from 'react'
import { LayoutDashboard } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const dashboardModule: AppModule = {
  id: 'dashboard',
  nav: { label: 'Dashboard', icon: LayoutDashboard, order: 1, path: '/' },
  permissions: ['dashboard.read'],
  routes: [
    {
      path: '/',
      title: 'Dashboard',
      component: lazy(() => import('./Screen').then((m) => ({ default: m.Screen }))),
    },
  ],
}
