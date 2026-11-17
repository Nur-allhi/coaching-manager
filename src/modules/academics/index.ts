import { lazy } from 'react'
import { CalendarRange } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public read surface for modules that need batch metadata (TAD.md §2). */
export { listBatches } from './service'

export const academicsModule: AppModule = {
  id: 'academics',
  nav: { labelKey: 'nav.academics', icon: CalendarRange, order: 3, path: '/academics' },
  permissions: ['academics.read'],
  routes: [
    {
      path: '/academics',
      titleKey: 'nav.academics',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
