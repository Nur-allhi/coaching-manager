import { afterEach, describe, expect, it } from 'vitest'
import i18n, { getLanguage, LANGUAGE_KEY, setLanguage } from './index'
import { en } from './locales/en'
import { bn } from './locales/bn'

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  )
}

afterEach(async () => {
  await setLanguage('en')
})

describe('i18n resources', () => {
  it('gives English and Bangla the same key set', () => {
    expect(keysOf(bn.translation).sort()).toEqual(keysOf(en.translation).sort())
  })

  it('uses dotted keys for every module navigation label', () => {
    for (const key of keysOf(en.translation.nav, 'nav')) expect(key).toMatch(/^nav\.[a-zA-Z]+$/)
  })
})

describe('language control', () => {
  it('switches strings and the document language to Bangla', async () => {
    await setLanguage('bn')
    expect(getLanguage()).toBe('bn')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('bn')
    expect(document.documentElement.lang).toBe('bn')
    expect(i18n.t('nav.students')).toBe('শিক্ষার্থী')
  })

  it('switches back to English', async () => {
    await setLanguage('bn')
    await setLanguage('en')
    expect(getLanguage()).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(i18n.t('nav.students')).toBe('Students')
  })
})
