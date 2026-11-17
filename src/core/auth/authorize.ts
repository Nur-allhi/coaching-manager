/** Service-side permission gate (SECURITY §4). The authority object is the authenticated session. */
import { PermissionDeniedError, SessionRequiredError } from './errors'
import { hasPermission, type Permission } from './roles'
import type { Session } from './session'

export function assertPermission(session: Session | null, permission: Permission): void {
  if (!session) throw new SessionRequiredError(permission)
  if (!hasPermission(session.role, permission)) {
    throw new PermissionDeniedError(permission, session.role)
  }
}
