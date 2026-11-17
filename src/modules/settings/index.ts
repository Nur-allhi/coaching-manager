import { lazy } from 'react'
import { Settings } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public read surface for settings (TAD.md §2), used by receipts, reports and grade conversion. */
export { getSetting } from './repository'
export type { Grade, GradingScale } from './defaults'

export const settingsModule: AppModule = {
  id: 'settings',
  nav: { labelKey: 'nav.settings', icon: Settings, order: 11, path: '/settings' },
  permissions: ['settings.read'],
  routes: [
    {
      path: '/settings',
      titleKey: 'nav.settings',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
    {
      // T-091: the guide is a help route owned by settings; it is linked from the sidebar.
      path: '/guide',
      titleKey: 'guide.title',
      component: lazy(() =>
        import('../guide/Screen').then((mod) => ({ default: mod.GuideScreen })),
      ),
    },
  ],
}
