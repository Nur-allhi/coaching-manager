import { lazy } from 'react'
import { GraduationCap } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const enrollmentsModule: AppModule = {
  id: 'enrollments',
  nav: { labelKey: 'nav.enrollments', icon: GraduationCap, order: 4, path: '/enrollments' },
  permissions: ['enrollments.read', 'enrollments.write'],
  routes: [
    {
      path: '/enrollments',
      titleKey: 'nav.enrollments',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
