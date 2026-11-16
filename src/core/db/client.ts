/**
 * The main-thread half of the P0-2 spike. P0-3 replaces this with the full serialized
 * `Db` client, but the worker creation and Comlink wrapping stay the same.
 */
import * as Comlink from 'comlink'
import type { SpikeDbApi } from './worker'

export type SpikeDb = Comlink.Remote<SpikeDbApi>

let instance: SpikeDb | undefined

export function getSpikeDb(): SpikeDb {
  if (!instance) {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    instance = Comlink.wrap<SpikeDbApi>(worker)
  }
  return instance
}
