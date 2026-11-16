import { lazy } from 'react'
import { CheckSquare } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const attendanceModule: AppModule = {
  id: 'attendance',
  nav: { labelKey: 'nav.attendance', icon: CheckSquare, order: 6, path: '/attendance' },
  permissions: ['attendance.read'],
  routes: [
    {
      path: '/attendance',
      titleKey: 'nav.attendance',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
