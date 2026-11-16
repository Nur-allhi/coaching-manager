import { describe, expect, it } from 'vitest'
import {
  applyFixedDiscount,
  applyPercentDiscount,
  formatMinor,
  netAmount,
  parseToMinor,
  sumMinor,
} from './money'

describe('money helpers', () => {
  it('adds paisa exactly', () => {
    expect(sumMinor([100, 250, 1])).toBe(351)
    expect(sumMinor([])).toBe(0)
  })

  it('refuses a fractional or unsafe amount', () => {
    expect(() => sumMinor([1.5])).toThrow('integer')
    expect(() => applyFixedDiscount(100.5, 10)).toThrow('integer')
    expect(() => applyPercentDiscount(Number.MAX_SAFE_INTEGER + 2, 10)).toThrow('integer')
  })

  it('returns the percent discount, rounded once to the nearest paisa', () => {
    // The acceptance lines from TICKETS.md T-014.
    expect(applyPercentDiscount(3333, 15)).toBe(500)
    expect(applyPercentDiscount(1000, 7)).toBe(70)

    expect(applyPercentDiscount(3332, 15)).toBe(500) // 499.8 → 500
    expect(applyPercentDiscount(3330, 15)).toBe(500) // 499.5 → 500 (tie rounds up)
    expect(applyPercentDiscount(3331, 15)).toBe(500) // 499.65 → 500
    expect(applyPercentDiscount(3329, 15)).toBe(499) // 499.35 → 499
    expect(applyPercentDiscount(10, 5)).toBe(1) // 0.5 → 1
    expect(applyPercentDiscount(9, 5)).toBe(0) // 0.45 → 0
    expect(applyPercentDiscount(1000, 0)).toBe(0)
    expect(applyPercentDiscount(1000, 100)).toBe(1000)
  })

  it('rejects a percent that is not a whole number in range', () => {
    expect(() => applyPercentDiscount(1000, -1)).toThrow('0 and 100')
    expect(() => applyPercentDiscount(1000, 101)).toThrow('0 and 100')
    expect(() => applyPercentDiscount(1000, 12.5)).toThrow('whole number')
    expect(() => applyPercentDiscount(1000, Number.NaN)).toThrow('whole number')
  })

  it('never discounts more than the amount', () => {
    expect(applyFixedDiscount(100, 250)).toBe(100)
    expect(applyPercentDiscount(100, 100)).toBe(100)
    expect(netAmount(100, 'fixed', 250)).toBe(0)
    expect(() => applyFixedDiscount(100, -5)).toThrow('negative')
  })

  it('applies the right discount kind', () => {
    expect(netAmount(1000, 'none', 0)).toBe(1000)
    expect(netAmount(1000, 'fixed', 250)).toBe(750)
    expect(netAmount(1000, 'percent', 15)).toBe(850)
    expect(netAmount(3333, 'percent', 15)).toBe(2833)
  })

  it('returns an integer from every helper', () => {
    const values = [
      sumMinor([1, 2, 3]),
      applyFixedDiscount(1000, 250),
      applyPercentDiscount(3333, 15),
      netAmount(3333, 'percent', 15),
      parseToMinor('1,250.50'),
    ]
    for (const value of values) expect(Number.isInteger(value)).toBe(true)
  })

  it('formats taka with South Asian digit grouping', () => {
    expect(formatMinor(15000000)).toBe('1,50,000') // 150000 taka
    expect(formatMinor(15000050)).toBe('1,50,000.50')
    expect(formatMinor(150000)).toBe('1,500')
    expect(formatMinor(7)).toBe('0.07')
    expect(formatMinor(0)).toBe('0')
    expect(formatMinor(99900)).toBe('999')
    expect(formatMinor(100000)).toBe('1,000')
    expect(formatMinor(1234567890)).toBe('1,23,45,678.90')
    expect(formatMinor(-125050)).toBe('-1,250.50')
  })

  it('renders Bengali digits when asked', () => {
    expect(formatMinor(15000000, { digits: 'bengali' })).toBe('১,৫০,০০০')
    expect(formatMinor(15000050, { digits: 'bengali' })).toBe('১,৫০,০০০.৫০')
    expect(formatMinor(0, { digits: 'bengali' })).toBe('০')
  })

  it('parses a taka string into paisa, in either script', () => {
    expect(parseToMinor('1,250')).toBe(125000)
    expect(parseToMinor('1250.50')).toBe(125050)
    expect(parseToMinor('0.07')).toBe(7)
    expect(parseToMinor('-1.25')).toBe(-125)
    expect(parseToMinor(' 1,50,000 ')).toBe(15000000)
    expect(parseToMinor('৳1,250')).toBe(125000)
    expect(parseToMinor('১,২৫০.৫০')).toBe(125050)
    expect(() => parseToMinor('12.345')).toThrow('invalid money amount')
    expect(() => parseToMinor('abc')).toThrow('invalid money amount')
    expect(() => parseToMinor('')).toThrow('invalid money amount')
  })

  it('round-trips format and parse in both scripts', () => {
    for (const amount of [0, 7, 100, 3333, 150050, 99999999, -125050]) {
      expect(parseToMinor(formatMinor(amount))).toBe(amount)
      expect(parseToMinor(formatMinor(amount, { digits: 'bengali' }))).toBe(amount)
    }
  })
})
