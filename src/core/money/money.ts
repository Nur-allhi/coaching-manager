/**
 * Money helpers (PLAN.md §3, ticket T-014).
 *
 * Money is an integer number of paisa: 100 paisa = 1 taka. Nothing in this module accepts or
 * returns a fractional amount, and no arithmetic here goes through a float.
 *
 * Discount helpers return the **discount**, not the remainder. `netAmount` subtracts it.
 */
export type Minor = number

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const

export function sumMinor(values: readonly Minor[]): Minor {
  let total = 0
  for (const value of values) {
    assertMinor(value)
    total += value
  }
  return total
}

/** Fixed paisa off an amount, never more than the amount itself. */
export function applyFixedDiscount(amount: Minor, discount: Minor): Minor {
  assertMinor(amount)
  assertMinor(discount)
  if (discount < 0) throw new Error('discount must not be negative')
  return Math.min(amount, discount)
}

/**
 * Percent off an amount, in whole percent, rounded once to the nearest paisa.
 *
 * 15% of 3333 paisa = 499.95 → 500. 7% of 1000 paisa = 70 exactly.
 * Ties round up, so the rule is deterministic: 5% of 10 paisa = 0.5 → 1.
 * The arithmetic stays in integers: `(amount * percent + 50) / 100` floored.
 */
export function applyPercentDiscount(amount: Minor, percent: number): Minor {
  assertMinor(amount)
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error('percent must be a whole number between 0 and 100')
  }
  return Math.min(amount, Math.floor((amount * percent + 50) / 100))
}

/** The paisa left after a discount of either kind. */
export function netAmount(
  amount: Minor,
  discountKind: 'none' | 'fixed' | 'percent',
  discountValue: Minor,
): Minor {
  assertMinor(amount)
  assertMinor(discountValue)
  if (discountKind === 'fixed') return amount - applyFixedDiscount(amount, discountValue)
  if (discountKind === 'percent') return amount - applyPercentDiscount(amount, discountValue)
  return amount
}

/**
 * Group digits the South Asian way: the last three, then pairs. 150000 → "1,50,000".
 * `Intl.NumberFormat('en-BD')` groups in threes, which is not how taka are read here.
 */
function groupDigits(digits: string): string {
  if (digits.length <= 3) return digits
  const tail = digits.slice(-3)
  const groups: string[] = []
  let rest = digits.slice(0, -3)
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest) groups.unshift(rest)
  return [...groups, tail].join(',')
}

function toBengali(text: string): string {
  return text.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit)
}

export interface FormatMinorOptions {
  /** `bengali` renders Bengali digits. Off by default, matching PLAN.md §"Bangla digits optional". */
  digits?: 'latin' | 'bengali'
}

/** Format paisa as taka, dropping the decimal part when it is zero. */
export function formatMinor(amount: Minor, options: FormatMinorOptions = {}): string {
  assertMinor(amount)
  const absolute = Math.abs(amount)
  const taka = Math.floor(absolute / 100)
  const paisa = absolute % 100
  const whole = groupDigits(String(taka))
  const text = paisa === 0 ? whole : `${whole}.${String(paisa).padStart(2, '0')}`
  const signed = amount < 0 ? `-${text}` : text
  return options.digits === 'bengali' ? toBengali(signed) : signed
}

/**
 * Parse a taka string into integer paisa: "1,250.50" → 125050.
 * Accepts Bengali digits and thousands separators, and refuses more than two decimals.
 */
export function parseToMinor(input: string): Minor {
  const cleaned = toLatin(input)
    .replace(/[\s,৳]/g, '')
    .trim()
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('invalid money amount')
  const negative = cleaned.startsWith('-')
  const [whole, fraction = ''] = cleaned.replace('-', '').split('.')
  const taka = Number(whole)
  if (!Number.isSafeInteger(taka)) throw new Error('amount is too large')
  const total = taka * 100 + Number(fraction.padEnd(2, '0'))
  assertMinor(total)
  return negative ? -total : total
}

function toLatin(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit as '০')))
}

export function assertMinor(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error('money must be an integer number of paisa')
}
