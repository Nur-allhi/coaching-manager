import { describe, expect, it } from 'vitest'
import { modules, navigation, routes } from './registry'

describe('module registry', () => {
  it('registers every module from the frontend spec in the right order', () => {
    expect(navigation.map((nav) => nav.label)).toEqual([
      'Dashboard',
      'Students',
      'Academics',
      'Enrollments',
      'Payments',
      'Attendance',
      'Exams',
      'Leaderboard',
      'Reports',
      'Data tools',
      'Settings',
    ])
  })

  it('has unique ids, nav orders and paths', () => {
    expect(new Set(modules.map((m) => m.id)).size).toBe(modules.length)
    expect(new Set(navigation.map((n) => n.order)).size).toBe(navigation.length)
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length)
  })

  it('gives every module at least one route and permission', () => {
    for (const module of modules) {
      expect(module.routes.length, module.id).toBeGreaterThan(0)
      expect(module.permissions.length, module.id).toBeGreaterThan(0)
      expect(module.nav.path, module.id).toBeTruthy()
    }
  })

  it('gives every route a heading and a lazy component', () => {
    for (const route of routes) {
      expect(route.title, route.path).toBeTruthy()
      expect(typeof route.component, route.path).toBe('object') // React.lazy wrapper
    }
  })

  it('maps each nav entry to a real route', () => {
    const paths = new Set(routes.map((r) => r.path))
    for (const nav of navigation) expect(paths.has(nav.path)).toBe(true)
  })
})
