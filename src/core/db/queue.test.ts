import { describe, expect, it } from 'vitest'
import { SerialQueue } from './queue'

describe('SerialQueue', () => {
  it('returns each task result', async () => {
    const queue = new SerialQueue()
    expect(await queue.run(async () => 1)).toBe(1)
    expect(await queue.run(async () => 2)).toBe(2)
  })

  it('does not start a later task until an earlier one settles', async () => {
    const queue = new SerialQueue()
    const order: string[] = []
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const first = queue.run(async () => {
      order.push('first start')
      await gate
      order.push('first end')
    })
    const second = queue.run(async () => {
      order.push('second start')
    })

    await Promise.resolve()
    expect(order).toEqual(['first start'])

    release()
    await Promise.all([first, second])
    expect(order).toEqual(['first start', 'first end', 'second start'])
  })

  it('does not let a rejected task poison later tasks', async () => {
    const queue = new SerialQueue()
    await expect(
      queue.run(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await queue.run(async () => 'still works')).toBe('still works')
  })
})
