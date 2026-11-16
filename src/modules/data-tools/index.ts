import { lazy } from 'react'
import { HardDrive } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const dataToolsModule: AppModule = {
  id: 'data-tools',
  nav: { label: 'Data tools', icon: HardDrive, order: 10, path: '/data-tools' },
  permissions: ['data-tools.read'],
  routes: [
    {
      path: '/data-tools',
      title: 'Data tools',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
