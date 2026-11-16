import { lazy } from 'react'
import { FileText } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const examsModule: AppModule = {
  id: 'exams',
  nav: { labelKey: 'nav.exams', icon: FileText, order: 7, path: '/exams' },
  permissions: ['exams.read'],
  routes: [
    {
      path: '/exams',
      titleKey: 'nav.exams',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
