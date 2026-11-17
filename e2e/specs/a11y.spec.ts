import { readFileSync } from 'node:fs'
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
    // Tailwind v4 emits oklab/oklch/lab/color(srgb); parse them to sRGB bytes directly. Canvas
    // fillStyle cannot resolve those strings in Firefox, which made every pair look identical.
    const gamma = (v: number): number =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)),
        ),
      )
    const numbers = (value: string): number[] => value.match(/-?[\d.]+/g)?.map(Number) ?? []
    const oklab = (L: number, a: number, b: number): [number, number, number] => {
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
      return [
        gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      ]
    }
    const parse = (value: string): [number, number, number] => {
      const n = numbers(value)
      if (value.startsWith('color(srgb'))
        return [gamma(n[0] ?? 0), gamma(n[1] ?? 0), gamma(n[2] ?? 0)]
      if (value.startsWith('rgb')) return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0]
      if (value.startsWith('oklch')) {
        const [L, C, h] = n
        return oklab(
          L ?? 0,
          (C ?? 0) * Math.cos(((h ?? 0) * Math.PI) / 180),
          (C ?? 0) * Math.sin(((h ?? 0) * Math.PI) / 180),
        )
      }
      if (value.startsWith('oklab')) return oklab(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0)
      if (value.startsWith('lab')) {
        const [L, a, b] = n
        const fy = ((L ?? 0) + 16) / 116
        const f = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
        const X = f(fy + (a ?? 0) / 500) * 0.95047
        const Y = f(fy)
        const Z = f(fy - (b ?? 0) / 200) * 1.08883
        return [
          gamma(3.2406 * X - 1.5372 * Y - 0.4986 * Z),
          gamma(-0.9689 * X + 1.8758 * Y + 0.0415 * Z),
          gamma(0.0557 * X - 0.204 * Y + 1.057 * Z),
        ]
      }
      return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0]
    }
    const lum = ([r, g, b]: [number, number, number]): number => {
      const channel = (raw: number) => {
        const v = raw / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    // Translucent layers (e.g. dark:bg-input/30) cannot be compared in isolation; walk to the
    // nearest opaque ancestor instead, which is the colour the text is actually read against.
    const translucent = (color: string): boolean => {
      if (/rgba\(/.test(color)) return color.endsWith(', 0)') || Number(color.split(',')[3]) < 1
      const alpha = color.match(/\/\s*([\d.]+)\s*\)/)
      return Boolean(alpha && Number(alpha[1]) < 1)
    }
    const background = (element: Element): string => {
      let node: Element | null = element
      while (node) {
        const color = getComputedStyle(node).backgroundColor
        if (color && color !== 'transparent' && !translucent(color)) return color
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

    const light = await contrastPairs(page)
    expect(light.length, `contrast samples on ${screen}`).toBeGreaterThan(0)
    expect(
      light.filter((pair) => pair.ratio < 4.5),
      `AA contrast (light) on ${screen}`,
    ).toEqual([])
  })
}

test('dark theme tokens meet AA contrast', async () => {
  const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')
  const dark = css.slice(css.indexOf('.dark {'))
  const token = (name: string): string =>
    new RegExp(`--${name}:\\s*([^;]+);`).exec(dark)?.[1]?.trim() ?? ''
  const oklch = (value: string): [number, number, number] => {
    const n = value.match(/[\d.]+/g)?.map(Number) ?? []
    const [l, c, h] = n
    const a = (c ?? 0) * Math.cos(((h ?? 0) * Math.PI) / 180)
    const b = (c ?? 0) * Math.sin(((h ?? 0) * Math.PI) / 180)
    const ll = (l ?? 0) + 0.3963377774 * a + 0.2158037573 * b
    const mm = (l ?? 0) - 0.1055613458 * a - 0.0638541728 * b
    const ss = (l ?? 0) - 0.0894841775 * a - 1.291485548 * b
    const g = (v: number): number =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)),
        ),
      )
    return [
      g(4.0767416621 * ll ** 3 - 3.3077115913 * mm ** 3 + 0.2309699292 * ss ** 3),
      g(-1.2684380046 * ll ** 3 + 2.6097574011 * mm ** 3 - 0.3413193965 * ss ** 3),
      g(-0.0041960863 * ll ** 3 - 0.7034186147 * mm ** 3 + 1.707614701 * ss ** 3),
    ]
  }
  const contrast = (a: string, b: string): number => {
    const lum = (value: string): number => {
      const [r, g, bl] = oklch(value)
      const channel = (raw: number) => {
        const v = raw / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl)
    }
    const x = lum(a)
    const y = lum(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  expect(
    contrast(token('foreground'), token('background')),
    'foreground/background',
  ).toBeGreaterThanOrEqual(4.5)
  expect(
    contrast(token('primary-foreground'), token('primary')),
    'primary button',
  ).toBeGreaterThanOrEqual(4.5)
  expect(
    contrast(token('muted-foreground'), token('background')),
    'muted text',
  ).toBeGreaterThanOrEqual(4.5)
  expect(contrast(token('card-foreground'), token('card')), 'card text').toBeGreaterThanOrEqual(4.5)
})

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
