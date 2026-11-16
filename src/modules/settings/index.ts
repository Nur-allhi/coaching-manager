import { lazy } from 'react'
import { Settings } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const settingsModule: AppModule = {
  id: 'settings',
  nav: { label: 'Settings', icon: Settings, order: 11, path: '/settings' },
  permissions: ['settings.read'],
  routes: [
    {
      path: '/settings',
      title: 'Settings',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
