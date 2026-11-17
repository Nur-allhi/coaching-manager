/**
 * Roles and permissions from SECURITY.md §4. A permission is the only unit a service checks;
 * the role it comes from lives in the authenticated Session, never in a call parameter.
 */
export type Role = 'admin' | 'accountant' | 'teacher'

export type Permission =
  | 'students.read'
  | 'students.write'
  | 'payments.read'
  | 'payments.write'
  | 'dues.read'
  | 'reports.read'
  | 'attendance.read'
  | 'attendance.write'
  | 'exams.read'
  | 'exams.write'
  | 'settings.read'
  | 'settings.write'
  | 'backup.read'
  | 'backup.restore'
  | 'audit.read'

const ALL: readonly Permission[] = [
  'students.read',
  'students.write',
  'payments.read',
  'payments.write',
  'dues.read',
  'reports.read',
  'attendance.read',
  'attendance.write',
  'exams.read',
  'exams.write',
  'settings.read',
  'settings.write',
  'backup.read',
  'backup.restore',
  'audit.read',
]

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(ALL),
  accountant: new Set<Permission>(['payments.read', 'payments.write', 'dues.read', 'reports.read']),
  teacher: new Set<Permission>([
    'students.read',
    'attendance.read',
    'attendance.write',
    'exams.read',
    'exams.write',
  ]),
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function isRole(value: string): value is Role {
  return value === 'admin' || value === 'accountant' || value === 'teacher'
}
