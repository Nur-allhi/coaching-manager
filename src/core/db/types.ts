/**
 * The Db contract from PLAN.md §5.
 *
 * `tx` holds the call queue for the whole callback, so nothing outside the transaction can
 * observe uncommitted rows. A throw rolls back and rethrows.
 */
export type DbParam = string | number | bigint | Uint8Array | null

export interface Db {
  query<T>(sql: string, params?: readonly DbParam[]): Promise<T[]>
  run(sql: string, params?: readonly DbParam[]): Promise<{ changes: number }>
  tx<T>(fn: (t: Db) => Promise<T>): Promise<T>
  exportBytes(): Promise<Uint8Array>
  importBytes(bytes: Uint8Array): Promise<void>
}

/** The surface the Worker exposes over Comlink. */
export interface WorkerApi {
  init(): Promise<void>
  query(sql: string, params?: readonly DbParam[]): Promise<unknown[]>
  run(sql: string, params?: readonly DbParam[]): Promise<{ changes: number }>
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  exportBytes(): Promise<Uint8Array>
  importBytes(bytes: Uint8Array): Promise<void>
}
