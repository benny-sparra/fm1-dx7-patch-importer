import { describe, expect, it } from 'vitest'

import { normalizeLocale, resolveLocale } from './locale'

describe('normalizeLocale', () => {
  it('normalizes supported region variants', () => {
    expect(normalizeLocale('fr-CA')).toBe('fr')
  })

  it('maps Portuguese variants to the available Brazilian translation', () => {
    expect(normalizeLocale('pt_PT')).toBe('pt-BR')
  })

  it('maps Chinese variants to the available Simplified Chinese translation', () => {
    expect(normalizeLocale('zh-TW')).toBe('zh-Hans')
  })

  it('rejects empty and unsupported values', () => {
    expect(normalizeLocale('')).toBeNull()
    expect(normalizeLocale('ja-JP')).toBeNull()
  })
})

describe('resolveLocale', () => {
  it('prefers a supported saved choice over browser preferences', () => {
    expect(resolveLocale('de', ['fr-FR'])).toBe('de')
  })

  it('ignores an obsolete saved value and uses the first supported browser preference', () => {
    expect(resolveLocale('it', ['ja-JP', 'es-MX', 'en-US'])).toBe('es')
  })

  it('falls back to British English when no preference is supported', () => {
    expect(resolveLocale(null, ['ja-JP', 'ko-KR'])).toBe('en-GB')
  })

  it('chooses American English for a browser in the United States', () => {
    expect(resolveLocale(null, ['en-US'])).toBe('en-US')
  })

  it('chooses British English for English from other regions', () => {
    expect(resolveLocale(null, ['en-AU'])).toBe('en-GB')
    expect(resolveLocale(null, ['en'])).toBe('en-GB')
  })

  it('keeps a saved choice of either English', () => {
    expect(resolveLocale('en-US', ['en-GB'])).toBe('en-US')
    expect(resolveLocale('en-GB', ['en-US'])).toBe('en-GB')
  })

  // Earlier releases saved plain 'en', which named no spelling.
  it('reads a saved plain English as the browser’s own English', () => {
    expect(resolveLocale('en', ['en-US', 'fr-FR'])).toBe('en-US')
    expect(resolveLocale('en', ['en-IE'])).toBe('en-GB')
  })

  it('reads a saved plain English as British English when the browser prefers another language', () => {
    expect(resolveLocale('en', ['fr-FR', 'en-US'])).toBe('en-GB')
  })
})
