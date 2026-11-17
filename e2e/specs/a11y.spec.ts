import { expect, type Page, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-084 — a keyboard/contrast/360px walkthrough of the main screens, in both themes. */
const SCREENS = [
  '/',
  '/students',
  '/payments',
  '/reports',
  '/data-tools',
  '/data-tools/import',
  '/data-tools/audit',
  '/settings',
]

async function unlabelledControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = []
    const controls = document.querySelectorAll<HTMLElement>(
      'main input, main select, main textarea',
    )
    for (const control of controls) {
      if (control.getAttribute('type') === 'hidden' || control.getAttribute('aria-hidden')) continue
      const labelled =
        (control as HTMLInputElement).labels && (control as HTMLInputElement).labels!.length > 0
      const named = control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')
      if (!labelled && !named) {
        bad.push(`${control.tagName.toLowerCase()}[${control.dataset.testid ?? ''}]`)
      }
    }
    return bad
  })
}

async function contrastPairs(page: Page): Promise<Array<{ text: string; ratio: number }>> {
  return page.evaluate(() => {
    // Tailwind v4 emits oklch(); a canvas round-trip resolves any CSS colour to real sRGB bytes.
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')!
    const parse = (value: string): [number, number, number] => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const data = context.getImageData(0, 0, 1, 1).data
      return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0]
    }
    const lum = ([r, g, b]: [number, number, number]): number => {
      const channel = (raw: number) => {
        const v = raw / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const background = (element: Element): string => {
      let node: Element | null = element
      while (node) {
        const color = getComputedStyle(node).backgroundColor
        if (color && !/rgba\(0, 0, 0, 0\)|transparent/.test(color)) return color
        node = node.parentElement
      }
      return 'rgb(255, 255, 255)'
    }
    const results: Array<{ text: string; ratio: number }> = []
    const targets = document.querySelectorAll<HTMLElement>(
      'main h1, main h2, main button, main label, main p, main td',
    )
    for (const element of targets) {
      const text = (element.textContent ?? '').trim().slice(0, 40)
      if (!text) continue
      const fg = lum(parse(getComputedStyle(element).color))
      const bg = lum(parse(background(element)))
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
      results.push({ text, ratio })
    }
    return results
  })
}

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

for (const screen of SCREENS) {
  test(`${screen} is keyboard-operable, labelled and AA-contrasted`, async ({ page }) => {
    await page.goto(screen)
    await expect(page.locator('main').first()).toBeVisible()

    // Tab order follows the DOM and every focused element shows a visible ring.
    let previous = -1
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Tab')
      const focus = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null
        const index = Array.from(
          document.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]'),
        ).indexOf(active as HTMLElement)
        const style = active ? getComputedStyle(active) : null
        return {
          index,
          ring: Boolean(style && (style.outlineStyle !== 'none' || style.boxShadow !== 'none')),
        }
      })
      expect(focus.index, `screen ${screen}, tab ${step}`).toBeGreaterThan(previous)
      previous = focus.index
      if (focus.index >= 0) expect(focus.ring, `focus ring on ${screen}`).toBe(true)
    }

    expect(await unlabelledControls(page), `labels on ${screen}`).toEqual([])

    for (const theme of ['light', 'dark']) {
      await page.evaluate((next) => {
        document.documentElement.classList.toggle('dark', next === 'dark')
      }, theme)
      const pairs = await contrastPairs(page)
      expect(pairs.length, `contrast samples on ${screen}`).toBeGreaterThan(0)
      const failures = pairs.filter((pair) => pair.ratio < 4.5)
      expect(failures, `AA contrast (${theme}) on ${screen}`).toEqual([])
    }
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
  })
}

test('main screens have no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  for (const screen of SCREENS) {
    await page.goto(screen)
    await expect(page.locator('main').first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, `horizontal overflow on ${screen} at 360px`).toBe(0)
  }
})
