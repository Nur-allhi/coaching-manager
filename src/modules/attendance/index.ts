import { lazy } from 'react'
import { CheckSquare } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const attendanceModule: AppModule = {
  id: 'attendance',
  nav: { label: 'Attendance', icon: CheckSquare, order: 6, path: '/attendance' },
  permissions: ['attendance.read'],
  routes: [
    {
      path: '/attendance',
      title: 'Attendance',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
