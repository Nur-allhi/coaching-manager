/**
 * Unit tests for the encrypted backup codec (T-033, D-038).
 * Node's WebCrypto is injected; 1,000 PBKDF2 iterations keep tests fast while exercising the
 * real algorithms (the shipped default is 600,000).
 */
import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { BackupFormatError, decryptBackup, encryptBackup, WrongPassphraseError } from './crypto'
import type { WebCrypto } from './crypto-types'

const crypto = webcrypto as unknown as WebCrypto
const ITERATIONS = 1_000
const PLAIN = new TextEncoder().encode('SQLite format 3\u0000' + 'x'.repeat(200))

async function roundTrip(passphrase = 'correct horse') {
  const file = await encryptBackup(PLAIN, passphrase, 42, crypto, ITERATIONS)
  return decryptBackup(file, passphrase, crypto)
}

describe('encrypted backup codec', () => {
  it('round-trips bytes and preserves metadata', async () => {
    const { plain, meta } = await roundTrip()
    expect(new TextDecoder().decode(plain)).toBe(new TextDecoder().decode(PLAIN))
    expect(meta).toMatchObject({
      formatVersion: 1,
      schemaVersion: 42,
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: ITERATIONS,
    })
    expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('fails with a wrong passphrase', async () => {
    const file = await encryptBackup(PLAIN, 'right', 1, crypto, ITERATIONS)
    await expect(decryptBackup(file, 'wrong', crypto)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('uses a random salt and IV per encryption', async () => {
    const a = await encryptBackup(PLAIN, 'pw', 1, crypto, ITERATIONS)
    const b = await encryptBackup(PLAIN, 'pw', 1, crypto, ITERATIONS)
    expect(new TextDecoder().decode(a)).not.toBe(new TextDecoder().decode(b))
  })

  it('rejects a file that is not a backup', async () => {
    await expect(
      decryptBackup(new TextEncoder().encode('not a backup'), 'pw', crypto),
    ).rejects.toBeInstanceOf(BackupFormatError)
  })

  it('rejects a tampered ciphertext', async () => {
    const file = await encryptBackup(PLAIN, 'pw', 1, crypto, ITERATIONS)
    const last = file.length - 1
    file[last] = (file[last] ?? 0) ^ 0xff
    await expect(decryptBackup(file, 'pw', crypto)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('rejects an empty passphrase', async () => {
    await expect(encryptBackup(PLAIN, '', 1, crypto, ITERATIONS)).rejects.toBeInstanceOf(
      BackupFormatError,
    )
  })
})
