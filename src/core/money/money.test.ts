import { describe, expect, it } from 'vitest'
import {
  applyFixedDiscount,
  applyPercentDiscount,
  formatMinor,
  netAmount,
  parseToMinor,
  sumMinor,
} from './money'

describe('money helpers (whole taka)', () => {
  it('adds taka exactly', () => {
    expect(sumMinor([100, 250, 1])).toBe(351)
    expect(sumMinor([])).toBe(0)
  })

  it('refuses a fractional or unsafe amount', () => {
    expect(() => sumMinor([1.5])).toThrow('integer')
    expect(() => applyFixedDiscount(100.5, 10)).toThrow('integer')
    expect(() => applyPercentDiscount(Number.MAX_SAFE_INTEGER + 2, 10)).toThrow('integer')
  })

  it('returns the percent discount, rounded once to the nearest taka', () => {
    expect(applyPercentDiscount(3333, 15)).toBe(500)
    expect(applyPercentDiscount(1000, 7)).toBe(70)
    expect(applyPercentDiscount(3332, 15)).toBe(500)
    expect(applyPercentDiscount(3330, 15)).toBe(500)
    expect(applyPercentDiscount(3329, 15)).toBe(499)
    expect(applyPercentDiscount(10, 5)).toBe(1)
    expect(applyPercentDiscount(9, 5)).toBe(0)
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
    expect(formatMinor(150000)).toBe('1,50,000')
    expect(formatMinor(150000)).toBe('1,50,000')
    expect(formatMinor(1500)).toBe('1,500')
    expect(formatMinor(7)).toBe('7')
    expect(formatMinor(0)).toBe('0')
    expect(formatMinor(999)).toBe('999')
    expect(formatMinor(1000)).toBe('1,000')
    expect(formatMinor(1234567890)).toBe('1,23,45,67,890')
    expect(formatMinor(-1250)).toBe('-1,250')
  })

  it('renders Bengali digits when asked', () => {
    expect(formatMinor(150000, { digits: 'bengali' })).toBe('১,৫০,০০০')
    expect(formatMinor(0, { digits: 'bengali' })).toBe('০')
  })

  it('parses a taka string into whole taka, in either script', () => {
    expect(parseToMinor('1,250')).toBe(1250)
    expect(parseToMinor('1250.50')).toBe(1251)
    expect(parseToMinor('0.07')).toBe(0)
    expect(parseToMinor('-1.25')).toBe(-1)
    expect(parseToMinor(' 1,50,000 ')).toBe(150000)
    expect(parseToMinor('৳1,250')).toBe(1250)
    expect(parseToMinor('১,২৫০')).toBe(1250)
    expect(() => parseToMinor('abc')).toThrow('invalid money amount')
    expect(() => parseToMinor('')).toThrow('invalid money amount')
  })

  it('round-trips format and parse in both scripts', () => {
    for (const amount of [0, 7, 100, 3333, 150050, 99999999, -1250]) {
      expect(parseToMinor(formatMinor(amount))).toBe(amount)
      expect(parseToMinor(formatMinor(amount, { digits: 'bengali' }))).toBe(amount)
    }
  })
})
