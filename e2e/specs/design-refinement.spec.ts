import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** Design refinement: the locked radius, elevation and focus rules must survive regeneration. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
})

test('radius scale is pinned across controls, cards and overlay shells', async ({ page }) => {
  await page.goto('/students/new')
  await expect(page.locator('[data-slot="input"]').first()).toBeVisible()

  const inputRadius = await page
    .locator('[data-slot="input"]')
    .first()
    .evaluate((el) => getComputedStyle(el).borderRadius)
  expect(inputRadius).toBe('8px')

  await page.goto('/')
  await expect(page.locator('.glass-card').first()).toBeVisible()
  const radii = await page.evaluate(() => {
    const radius = (el: Element | null) => (el ? getComputedStyle(el).borderRadius : null)
    const injected = (slot: string) => {
      const el = document.createElement('div')
      el.setAttribute('data-slot', slot)
      document.body.appendChild(el)
      return el
    }
    return {
      card: radius(document.querySelector('.glass-card')),
      dialog: radius(injected('dialog-content')),
      sheet: radius(injected('sheet-content')),
      popover: radius(injected('popover-content')),
    }
  })

  expect(radii.card).toBe('12px')
  expect(radii.dialog).toBe('16px')
  expect(radii.sheet).toBe('16px')
  expect(radii.popover).toBe('12px')
})

test('focused field gets one ring, a primary border and an opaque surface', async ({ page }) => {
  await page.goto('/students/new')
  const input = page.locator('[data-slot="input"]').first()
  const style = (el: Element) => {
    const s = getComputedStyle(el)
    return {
      outlineWidth: s.outlineWidth,
      outlineStyle: s.outlineStyle,
      outlineOffset: s.outlineOffset,
      boxShadow: s.boxShadow,
      borderColor: s.borderColor,
      background: s.backgroundColor,
    }
  }

  const before = await input.evaluate(style)
  await input.click()
  const after = await input.evaluate(style)

  expect(after.outlineWidth).toBe('2px')
  expect(after.outlineStyle).toBe('solid')
  expect(after.outlineOffset).toBe('2px')
  expect(after.boxShadow).toBe('none')
  expect(after.borderColor).not.toBe(before.borderColor)
  expect(after.background).not.toBe(before.background)
})

test('elevation is present in both themes and stripped for print', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.glass-card').first()
  await expect(card).toBeVisible()

  const light = await card.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(light).not.toBe('none')

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await card.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(dark).not.toBe(light)

  await page.emulateMedia({ media: 'print' })
  expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
  expect(await card.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px')
})

test('desktop sidebar floats with a 12px inset and a 240px panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const panel = page.locator('[data-slot="sidebar-container"]')
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()

  expect(box).not.toBeNull()
  expect(box!.x).toBeCloseTo(12, 0)
  expect(box!.y).toBeCloseTo(12, 0)
  expect(box!.width).toBeCloseTo(240, 0)
  expect(await panel.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('12px')
})
