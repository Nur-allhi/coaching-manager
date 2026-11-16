import { describe, expect, it } from 'vitest'
import { fixedClock, systemClock } from './clock'
import {
  daysBetween,
  dhakaDayStart,
  formatDate,
  isDate,
  isMonth,
  monthsBetween,
  shiftMonth,
  startOfMonth,
  toDateString,
  today,
  toMonth,
  toMonthOf,
} from './dates'

describe('clock', () => {
  it('injects a fixed instant instead of reading the wall clock', () => {
    const at = Date.parse('2026-11-16T10:00:00Z')
    expect(fixedClock(at)()).toBe(at)
    expect(today(fixedClock(at))).toBe('2026-11-16')
  })

  it('exposes the system clock as a function', () => {
    expect(typeof systemClock()).toBe('number')
  })
})

describe('Dhaka dates', () => {
  it('crosses the Dhaka day boundary at 18:00 UTC', () => {
    // 2026-01-01T18:29:59Z is 2026-01-02 00:29:59 in Dhaka (+6).
    expect(toDateString(Date.parse('2026-01-01T17:59:59Z'))).toBe('2026-01-01')
    expect(toDateString(Date.parse('2026-01-01T18:00:00Z'))).toBe('2026-01-02')
  })

  it('starts a Dhaka day at 18:00 UTC the previous evening', () => {
    expect(dhakaDayStart('2026-01-02')).toBe(Date.parse('2026-01-01T18:00:00Z'))
    expect(dhakaDayStart('2026-11-16')).toBe(Date.parse('2026-11-15T18:00:00Z'))
  })

  it('round-trips a date through its day start', () => {
    for (const date of ['2026-01-01', '2026-06-15', '2026-12-31', '2024-02-29']) {
      expect(toDateString(dhakaDayStart(date))).toBe(date)
    }
  })

  it('takes the month in Dhaka, not UTC', () => {
    // 2026-01-31T20:00:00Z is already 1 February in Dhaka.
    expect(toMonthOf(Date.parse('2026-01-31T20:00:00Z'))).toBe('2026-02')
    expect(toMonthOf(Date.parse('2026-01-31T17:00:00Z'))).toBe('2026-01')
  })
})

describe('date validation', () => {
  it('accepts real calendar dates only', () => {
    expect(isDate('2026-11-16')).toBe(true)
    expect(isDate('2024-02-29')).toBe(true)
    expect(isDate('2026-02-29')).toBe(false)
    expect(isDate('2026-02-30')).toBe(false)
    expect(isDate('2026-13-01')).toBe(false)
    expect(isDate('2026-00-10')).toBe(false)
    expect(isDate('26-11-16')).toBe(false)
    expect(isDate('')).toBe(false)
  })

  it('validates a month string', () => {
    expect(isMonth('2026-01')).toBe(true)
    expect(isMonth('2026-12')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth('2026-1')).toBe(false)
  })

  it('refuses an invalid date instead of silently shifting it', () => {
    expect(() => toMonth('2026-02-30')).toThrow('invalid date')
    expect(() => formatDate('nope')).toThrow('invalid date')
  })
})

describe('date arithmetic', () => {
  it('counts whole days between two dates, signed', () => {
    expect(daysBetween('2026-11-16', '2026-11-16')).toBe(0)
    expect(daysBetween('2026-11-16', '2026-11-17')).toBe(1)
    expect(daysBetween('2026-11-17', '2026-11-16')).toBe(-1)
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2) // leap year
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1)
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('shifts months across a year boundary', () => {
    expect(shiftMonth('2026-01', 1)).toBe('2026-02')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-06', 12)).toBe('2027-06')
    expect(shiftMonth('2026-06', -18)).toBe('2024-12')
    expect(() => shiftMonth('2026-06', 1.5)).toThrow('whole number')
  })

  it('lists the months in a range inclusively', () => {
    expect(monthsBetween('2026-10', '2027-01')).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ])
    expect(monthsBetween('2026-05', '2026-05')).toEqual(['2026-05'])
    expect(monthsBetween('2026-06', '2026-05')).toEqual([])
  })

  it('finds the first day of the month', () => {
    expect(startOfMonth('2026-11-16')).toBe('2026-11-01')
    expect(toMonth('2026-11-16')).toBe('2026-11')
  })

  it('formats a date for display', () => {
    expect(formatDate('2026-11-16')).toBe('16 Nov 2026')
    expect(formatDate('2026-11-16', 'yyyy-MM-dd')).toBe('2026-11-16')
  })
})
