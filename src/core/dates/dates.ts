/**
 * Date helpers (PLAN.md §3, ticket T-014).
 *
 * Three storage shapes, and nothing else:
 *   - a date is `YYYY-MM-DD` (`admitted_on`, `held_on`)
 *   - a month is `YYYY-MM` (`charges.month`)
 *   - a timestamp is epoch milliseconds UTC (`created_at`, `audit_log.at`)
 *
 * "Today" always means today in Asia/Dhaka. Dhaka is UTC+6 all year, with no daylight
 * saving, so a fixed offset is exact.
 *
 * The instant-based functions do their arithmetic in UTC on purpose. `date-fns` `format`
 * and `parse` read the *runtime's* local zone, so using them here would give a different
 * answer on a laptop in Dhaka than on a CI runner in UTC. They are used only for display,
 * where the value round-trips through the same zone it was written in.
 */
import { format, parse } from 'date-fns'

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DAY_MS = 86_400_000

export type DateString = string
export type MonthString = string

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** A `YYYY-MM-DD` Dhaka date for an instant. */
export function toDateString(instant: number): DateString {
  const shifted = new Date(instant + DHAKA_OFFSET_MS)
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** Today's Dhaka date, as `YYYY-MM-DD`. */
export function today(clock: () => number = Date.now): DateString {
  return toDateString(clock())
}

/** The epoch-ms instant at which the given Dhaka date begins. */
export function dhakaDayStart(date: DateString): number {
  const { year, month, day } = partsOf(date)
  return Date.UTC(year, month - 1, day) - DHAKA_OFFSET_MS
}

/** The `YYYY-MM` month a `YYYY-MM-DD` date belongs to. */
export function toMonth(date: DateString): MonthString {
  if (!isDate(date)) throw new Error(`invalid date: ${date}`)
  return date.slice(0, 7)
}

/** The `YYYY-MM` month an instant falls in, in Dhaka. */
export function toMonthOf(instant: number): MonthString {
  return toMonth(toDateString(instant))
}

/** Shift a month string by a whole number of months: `shiftMonth('2026-01', 1)` → `'2026-02'`. */
export function shiftMonth(month: MonthString, delta: number): MonthString {
  if (!isMonth(month)) throw new Error(`invalid month: ${month}`)
  if (!Number.isInteger(delta)) throw new Error('month delta must be a whole number')
  const [yearText, monthText] = month.split('-')
  const index = Number(yearText) * 12 + (Number(monthText) - 1) + delta
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`
}

/** Every month from `from` to `to` inclusive, in order. Empty when `to` precedes `from`. */
export function monthsBetween(from: MonthString, to: MonthString): MonthString[] {
  if (!isMonth(from) || !isMonth(to)) throw new Error('invalid month')
  const months: MonthString[] = []
  for (let month = from; month <= to; month = shiftMonth(month, 1)) months.push(month)
  return months
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. Negative when `to` is earlier. */
export function daysBetween(from: DateString, to: DateString): number {
  return Math.round(dayNumber(to) - dayNumber(from))
}

function dayNumber(date: DateString): number {
  const { year, month, day } = partsOf(date)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

function partsOf(date: DateString): { year: number; month: number; day: number } {
  if (!isDate(date)) throw new Error(`invalid date: ${date}`)
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  }
}

/** The first day of the month a date falls in. */
export function startOfMonth(date: DateString): DateString {
  return `${toMonth(date)}-01`
}

/**
 * A real calendar date: the shape is right *and* the day exists.
 * `2026-02-30` is rejected rather than rolling over to 2 March.
 */
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  if (month < 1 || month > 12 || day < 1) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/**
 * Display a stored date, e.g. `16 Nov 2026`.
 * Display only: the value never leaves this function as a new stored date.
 */
export function formatDate(value: DateString, pattern = 'd MMM yyyy'): string {
  if (!isDate(value)) throw new Error(`invalid date: ${value}`)
  return format(parse(value, 'yyyy-MM-dd', new Date(0)), pattern)
}
