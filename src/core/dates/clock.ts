/**
 * The clock seam (ticket T-014).
 *
 * Nothing calls `Date.now()` directly outside this file, so a test can inject a fixed time
 * instead of depending on wall-clock time.
 */
export type Clock = () => number

export const systemClock: Clock = () => Date.now()

/** A clock frozen at one instant. Test-only, but harmless in the bundle. */
export function fixedClock(at: number): Clock {
  return () => at
}
