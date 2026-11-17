/** Typed auth errors (REPO_RULES §7.7) — the UI maps them to i18n keys at the edge. */
import type { Permission, Role } from './roles'

export class PermissionDeniedError extends Error {
  override readonly name = 'PermissionDeniedError'
  readonly permission: Permission
  readonly role: Role

  constructor(permission: Permission, role: Role) {
    super(`Permission ${permission} is not allowed for the ${role} role`)
    this.permission = permission
    this.role = role
  }
}

export class SessionRequiredError extends Error {
  override readonly name = 'SessionRequiredError'
  readonly permission: Permission

  constructor(permission: Permission) {
    super(`Permission ${permission} requires an unlocked session`)
    this.permission = permission
  }
}

export class WeakPinError extends Error {
  override readonly name = 'WeakPinError'
  constructor() {
    super('PIN must be at least six digits')
  }
}

export class PinNotSetError extends Error {
  override readonly name = 'PinNotSetError'
  constructor() {
    super('No PIN has been configured')
  }
}
