/**
 * The module contract from PLAN.md §5 and TAD.md §8.
 *
 * A module contributes four things to the shell: a unique id, a navigation entry, one or
 * more permission keys, and a lazy route. The registry reads these manifests, never the
 * other way around, so adding a module does not mean editing the shell.
 */
import type { LucideIcon } from 'lucide-react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { Migration } from '@/core/db/migrate'

export interface NavEntry {
  /** The i18n key for the label shown in the sidebar. */
  labelKey: string
  icon: LucideIcon
  /** Navigation order, ascending, 1-based. */
  order: number
  /** The module's default route. */
  path: string
}

export interface ModuleRoute {
  /** An absolute React Router path, e.g. `/students/new`. */
  path: string
  /** The i18n key for the heading the route renders; used by tests and the header. */
  titleKey: string
  component: LazyExoticComponent<ComponentType>
}

export interface AppModule {
  id: string
  nav: NavEntry
  permissions: readonly string[]
  routes: readonly ModuleRoute[]
  /** SQL migrations owned by this module, in version order. */
  migrations?: readonly Migration[]
}
