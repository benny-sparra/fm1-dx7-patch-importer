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

  it('falls back to English when no preference is supported', () => {
    expect(resolveLocale(null, ['ja-JP', 'ko-KR'])).toBe('en')
  })
})
