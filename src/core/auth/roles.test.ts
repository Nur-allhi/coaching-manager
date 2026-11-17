import { describe, expect, it } from 'vitest'
import { assertPermission } from './authorize'
import { PermissionDeniedError, SessionRequiredError } from './errors'
import { hasPermission, ROLE_PERMISSIONS, type Permission, type Role } from './roles'
import type { Session } from './session'

function session(role: Role): Session {
  return { actorId: role, role, authenticatedAt: 0 }
}

describe('role permissions (SECURITY §4)', () => {
  it('grants every permission to admin', () => {
    for (const permission of ROLE_PERMISSIONS.admin) {
      expect(hasPermission('admin', permission)).toBe(true)
    }
  })

  it('lets an accountant read and write payments and dues but not touch students', () => {
    expect(hasPermission('accountant', 'payments.write')).toBe(true)
    expect(hasPermission('accountant', 'dues.read')).toBe(true)
    expect(hasPermission('accountant', 'reports.read')).toBe(true)
    expect(hasPermission('accountant', 'students.read')).toBe(false)
    expect(hasPermission('accountant', 'students.write')).toBe(false)
    expect(hasPermission('accountant', 'backup.restore')).toBe(false)
  })

  it('lets a teacher write attendance and marks but never payments', () => {
    expect(hasPermission('teacher', 'attendance.write')).toBe(true)
    expect(hasPermission('teacher', 'exams.write')).toBe(true)
    expect(hasPermission('teacher', 'students.read')).toBe(true)
    expect(hasPermission('teacher', 'payments.write')).toBe(false)
    expect(hasPermission('teacher', 'payments.read')).toBe(false)
    expect(hasPermission('teacher', 'audit.read')).toBe(false)
  })

  it('refuses a locked session and refuses a permission the role lacks', () => {
    expect(() => assertPermission(null, 'payments.write')).toThrow(SessionRequiredError)
    expect(() => assertPermission(session('teacher'), 'payments.write')).toThrow(
      PermissionDeniedError,
    )
    expect(() => assertPermission(session('admin'), 'payments.write')).not.toThrow()
  })

  it('rejects arbitrary strings as roles', () => {
    const bad = 'superuser' as Role
    expect(() => assertPermission(session(bad), 'payments.write' as Permission)).toThrow(
      PermissionDeniedError,
    )
  })
})
