/**
 * Encrypted backup file codec (T-033; PLAN.md §3 locked crypto, TAD.md §13, D-038).
 *
 * A single self-describing binary file:
 *   magic (8 bytes "CCMBKUP1") | meta length (uint32 BE) | JSON metadata | ciphertext+tag
 *
 * Metadata: { formatVersion, schemaVersion, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA-256',
 * iterations, salt (base64), iv (base64), sha256 (hex of the plaintext), byteLength }.
 * The AES-GCM auth tag makes a wrong passphrase fail. The plaintext SHA-256 is a second guard.
 * No network, no third-party library — WebCrypto only. Passphrase is a parameter, never stored.
 */
import type { WebCrypto } from './crypto-types'
export type { WebCrypto } from './crypto-types'

const MAGIC = new TextEncoder().encode('CCMBKUP1')
const META_LENGTH_BYTES = 4
const SALT_BYTES = 16
const IV_BYTES = 12
const DEFAULT_ITERATIONS = 600_000

export interface BackupMeta {
  formatVersion: 1
  schemaVersion: number
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  iv: string
  sha256: string
  byteLength: number
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupFormatError'
  }
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('wrong passphrase or corrupted backup')
    this.name = 'WrongPassphraseError'
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveKey(
  crypto: WebCrypto,
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Wrap a backup file with AES-GCM. `iterations` is injectable for fast tests. */
export async function encryptBackup(
  plain: Uint8Array,
  passphrase: string,
  schemaVersion: number,
  crypto: WebCrypto,
  iterations = DEFAULT_ITERATIONS,
): Promise<Uint8Array> {
  if (!passphrase) throw new BackupFormatError('passphrase must not be empty')

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(crypto, passphrase, salt, iterations)
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      plain as BufferSource,
    ),
  )
  const digest = await crypto.subtle.digest('SHA-256', plain as BufferSource)

  const meta: BackupMeta = {
    formatVersion: 1,
    schemaVersion,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    sha256: toHex(new Uint8Array(digest)),
    byteLength: plain.byteLength,
  }
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta))
  const metaLength = new Uint8Array(META_LENGTH_BYTES)
  new DataView(metaLength.buffer).setUint32(0, metaBytes.byteLength, false)

  const out = new Uint8Array(MAGIC.length + META_LENGTH_BYTES + metaBytes.length + cipher.length)
  out.set(MAGIC, 0)
  out.set(metaLength, MAGIC.length)
  out.set(metaBytes, MAGIC.length + META_LENGTH_BYTES)
  out.set(cipher, MAGIC.length + META_LENGTH_BYTES + metaBytes.length)
  return out
}

/** Unwrap a backup file. Wrong passphrase, tampering or bad framing are distinct errors. */
export async function decryptBackup(
  file: Uint8Array,
  passphrase: string,
  crypto: WebCrypto,
): Promise<{ plain: Uint8Array; meta: BackupMeta }> {
  const header = file.slice(0, MAGIC.length)
  if (header.length !== MAGIC.length || !MAGIC.every((b, i) => b === header[i])) {
    throw new BackupFormatError('not a Coaching Manager backup file')
  }

  const view = new DataView(file.buffer, file.byteOffset + MAGIC.length, META_LENGTH_BYTES)
  const metaLength = view.getUint32(0, false)
  const metaStart = MAGIC.length + META_LENGTH_BYTES
  const metaEnd = metaStart + metaLength
  if (metaEnd > file.byteLength) throw new BackupFormatError('truncated metadata')

  let meta: BackupMeta
  try {
    meta = JSON.parse(new TextDecoder().decode(file.slice(metaStart, metaEnd))) as BackupMeta
  } catch {
    throw new BackupFormatError('invalid metadata')
  }
  if (meta.formatVersion !== 1 || meta.algorithm !== 'AES-GCM' || meta.kdf !== 'PBKDF2-SHA-256') {
    throw new BackupFormatError('unsupported backup format')
  }

  const salt = fromBase64(meta.salt)
  const iv = fromBase64(meta.iv)
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES) {
    throw new BackupFormatError('invalid salt or IV')
  }

  const key = await deriveKey(crypto, passphrase, salt, meta.iterations)
  let plain: Uint8Array
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        file.slice(metaEnd) as BufferSource,
      ),
    )
  } catch {
    throw new WrongPassphraseError()
  }

  if (plain.byteLength !== meta.byteLength) throw new BackupFormatError('byte length mismatch')
  const digest = await crypto.subtle.digest('SHA-256', plain as BufferSource)
  if (toHex(new Uint8Array(digest)) !== meta.sha256)
    throw new BackupFormatError('checksum mismatch')

  return { plain, meta }
}
