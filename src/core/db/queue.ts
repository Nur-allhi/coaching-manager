/**
 * One promise queue. Every call waits for the previous one to settle, so a transaction
 * can never interleave with another statement.
 *
 * Errors are swallowed in the tail deliberately: the caller of `run` still receives the
 * rejection, but a failed task must not poison every later task.
 */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve()

  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn)
    this.tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}
