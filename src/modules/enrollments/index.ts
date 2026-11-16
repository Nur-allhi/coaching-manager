import { lazy } from 'react'
import { UserPlus } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const enrollmentsModule: AppModule = {
  id: 'enrollments',
  nav: { labelKey: 'nav.enrollments', icon: UserPlus, order: 4, path: '/enrollments' },
  permissions: ['enrollments.read'],
  routes: [
    {
      path: '/enrollments',
      titleKey: 'nav.enrollments',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
