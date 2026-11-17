import { lazy } from 'react'
import { FileText } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public read surface for exams, used by leaderboard/reports later (TAD §2). */
export { summaryFor, examOptions } from './service'
export type { ExamSummary } from './types'

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
    {
      path: '/exams/:id',
      titleKey: 'exams.title',
      component: lazy(() => import('./MarksGrid').then((mod) => ({ default: mod.MarksGrid }))),
    },
  ],
}
