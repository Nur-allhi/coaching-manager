/**
 * Money helpers (PLAN.md §3, ticket T-014; unit changed to whole taka on human instruction).
 *
 * Money is an integer number of taka. No arithmetic here goes through a float.
 * The `Minor` alias and `*_minor` column names are kept for compatibility; they now hold taka.
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

/** Fixed taka off an amount, never more than the amount itself. */
export function applyFixedDiscount(amount: Minor, discount: Minor): Minor {
  assertMinor(amount)
  assertMinor(discount)
  if (discount < 0) throw new Error('discount must not be negative')
  return Math.min(amount, discount)
}

/**
 * Percent off an amount, in whole percent, rounded once to the nearest taka.
 *
 * 15% of 3333 taka = 499.95 → 500. 7% of 1000 taka = 70 exactly.
 * Ties round up, so the rule is deterministic: 5% of 10 taka = 0.5 → 1.
 * The arithmetic stays in integers: `(amount * percent + 50) / 100` floored.
 */
export function applyPercentDiscount(amount: Minor, percent: number): Minor {
  assertMinor(amount)
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error('percent must be a whole number between 0 and 100')
  }
  return Math.min(amount, Math.floor((amount * percent + 50) / 100))
}

/** The taka left after a discount of either kind. */
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

/** Format whole taka with South Asian digit grouping. */
export function formatMinor(amount: Minor, options: FormatMinorOptions = {}): string {
  assertMinor(amount)
  const text = groupDigits(String(Math.abs(amount)))
  const signed = amount < 0 ? `-${text}` : text
  return options.digits === 'bengali' ? toBengali(signed) : signed
}

/**
 * Parse a taka string into whole taka: "1,250" → 1250. Decimals round to the nearest taka.
 * Accepts Bengali digits, thousands separators and the taka sign.
 */
export function parseToMinor(input: string): Minor {
  const cleaned = toLatin(input)
    .replace(/[\s,৳]/g, '')
    .trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) throw new Error('invalid money amount')
  const value = Number(cleaned)
  if (!Number.isFinite(value)) throw new Error('invalid money amount')
  const rounded = Math.round(value)
  assertMinor(rounded)
  return rounded
}

function toLatin(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit as '০')))
}

export function assertMinor(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error('money must be an integer number of taka')
}
