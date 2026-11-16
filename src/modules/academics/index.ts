import { lazy } from 'react'
import { CalendarRange } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const academicsModule: AppModule = {
  id: 'academics',
  nav: { label: 'Academics', icon: CalendarRange, order: 3, path: '/academics' },
  permissions: ['academics.read'],
  routes: [
    {
      path: '/academics',
      title: 'Academics',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
