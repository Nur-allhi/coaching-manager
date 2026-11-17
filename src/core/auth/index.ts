export type { Role, Permission } from './roles'
export { ROLE_PERMISSIONS, hasPermission, isRole } from './roles'
export { PermissionDeniedError, SessionRequiredError, WeakPinError } from './errors'
export { hashPin, verifyPin, isValidPinFormat, PIN_ITERATIONS, type PinRecord } from './pin'
export { hasPin, readPinRecord, setPin, checkPin, clearPin } from './pin-store'
export {
  currentSession,
  isLocked,
  needsSetup,
  unlock,
  lock,
  setSession,
  noteActivity,
  getIdleMinutes,
  setIdleMinutes,
  DEFAULT_IDLE_MINUTES,
  startIdleWatcher,
  subscribeAuth,
  authRevision,
  authChanged,
  type Session,
} from './session'
export { assertPermission } from './authorize'
