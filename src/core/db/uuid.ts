/**
 * UUIDv7 helper (PLAN.md §3: the `uuidv7` package).
 *
 * One place generates primary keys so ids are time-sortable and never built ad hoc.
 */
import { uuidv7 as generate } from 'uuidv7'

export function newId(): string {
  return generate()
}
