import { lazy } from 'react'
import { Users } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public read surface for modules that need student metadata (TAD.md §2). */
export { listStudents, getStudent } from './service'

export const studentsModule: AppModule = {
  id: 'students',
  nav: { labelKey: 'nav.students', icon: Users, order: 2, path: '/students' },
  permissions: ['students.read', 'students.write'],
  routes: [
    {
      path: '/students',
      titleKey: 'nav.students',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
    {
      path: '/students/new',
      titleKey: 'students.admit',
      component: lazy(() =>
        import('./AdmissionScreen').then((mod) => ({ default: mod.AdmissionScreen })),
      ),
    },
    {
      path: '/students/:id',
      titleKey: 'students.profile',
      component: lazy(() =>
        import('./StudentProfile').then((mod) => ({ default: mod.StudentProfile })),
      ),
    },
  ],
}
