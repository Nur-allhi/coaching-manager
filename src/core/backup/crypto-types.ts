/**
 * Minimal structural type for the subset of WebCrypto the backup codec uses (T-033).
 * `Crypto` from the DOM lib works; Node's `webcrypto` also satisfies this shape in tests.
 */
export interface WebCrypto {
  readonly subtle: {
    importKey(
      format: 'raw',
      keyData: BufferSource,
      algorithm: string,
      extractable: boolean,
      usages: string[],
    ): Promise<CryptoKey>
    deriveKey(
      algorithm: { name: string; salt: BufferSource; iterations: number; hash: string },
      baseKey: CryptoKey,
      derivedKeyAlgorithm: { name: string; length: number },
      extractable: boolean,
      usages: string[],
    ): Promise<CryptoKey>
    encrypt(
      algorithm: { name: string; iv: BufferSource },
      key: CryptoKey,
      data: BufferSource,
    ): Promise<ArrayBuffer>
    decrypt(
      algorithm: { name: string; iv: BufferSource },
      key: CryptoKey,
      data: BufferSource,
    ): Promise<ArrayBuffer>
    digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>
  }
  getRandomValues<T extends ArrayBufferView>(array: T): T
}
