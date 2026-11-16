import { lazy } from 'react'
import { HardDrive } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const dataToolsModule: AppModule = {
  id: 'data-tools',
  nav: { labelKey: 'nav.dataTools', icon: HardDrive, order: 10, path: '/data-tools' },
  permissions: ['data-tools.read'],
  routes: [
    {
      path: '/data-tools',
      titleKey: 'nav.dataTools',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
