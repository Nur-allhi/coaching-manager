/**
 * PIN hashing with WebCrypto (PLAN §3, SECURITY §3): PBKDF2-SHA-256, 600,000 iterations and a
 * fresh 16-byte random salt. The PIN is never stored, logged or compared in plain text.
 */
import { WeakPinError } from './errors'

export const PIN_ITERATIONS = 600_000
export const PIN_SALT_BYTES = 16

export interface PinRecord {
  salt: string
  hash: string
  iterations: number
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{6,}$/.test(pin)
}

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function derive(
  pin: string,
  salt: Uint8Array,
  iterations: number,
  cryptoImpl: Crypto,
): Promise<string> {
  const key = await cryptoImpl.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await cryptoImpl.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

/** Hash a new PIN. The default iterations MUST stay at the policy value; callers do not lower it. */
export async function hashPin(
  pin: string,
  cryptoImpl: Crypto = globalThis.crypto,
): Promise<PinRecord> {
  if (!isValidPinFormat(pin)) throw new WeakPinError()
  const salt = cryptoImpl.getRandomValues(new Uint8Array(PIN_SALT_BYTES))
  return {
    salt: toHex(salt),
    hash: await derive(pin, salt, PIN_ITERATIONS, cryptoImpl),
    iterations: PIN_ITERATIONS,
  }
}

/**
 * Verify a PIN. Comparison is over fixed-length hex digests and never reveals whether the PIN
 * exists or how many digits were correct (SECURITY §3.5).
 */
export async function verifyPin(
  pin: string,
  record: PinRecord,
  cryptoImpl: Crypto = globalThis.crypto,
): Promise<boolean> {
  const candidate = await derive(pin, fromHex(record.salt), record.iterations, cryptoImpl)
  if (candidate.length !== record.hash.length) return false
  let difference = 0
  for (let i = 0; i < candidate.length; i += 1) {
    difference |= candidate.charCodeAt(i) ^ record.hash.charCodeAt(i)
  }
  return difference === 0
}
