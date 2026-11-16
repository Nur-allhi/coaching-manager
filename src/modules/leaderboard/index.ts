import { lazy } from 'react'
import { Trophy } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

export const leaderboardModule: AppModule = {
  id: 'leaderboard',
  nav: { labelKey: 'nav.leaderboard', icon: Trophy, order: 8, path: '/leaderboard' },
  permissions: ['leaderboard.read'],
  routes: [
    {
      path: '/leaderboard',
      titleKey: 'nav.leaderboard',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
  ],
}
