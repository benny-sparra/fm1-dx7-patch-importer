import { createInstance } from 'i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createLazyNamespace,
  loadActiveNamespaces,
  resetActiveNamespaces,
  type NamespaceImporters,
} from './lazy-namespace'

afterEach(() => resetActiveNamespaces())

function instanceWith(language: string) {
  const instance = createInstance()
  void instance.init({ initAsync: false, lng: language, resources: {} })
  return instance
}

function importersFor(resources: Partial<Record<string, Record<string, unknown>>>) {
  const calls: string[] = []
  const importers = Object.fromEntries(
    ['de', 'en', 'es', 'fr', 'pt-BR', 'zh-Hans'].map((locale) => [
      locale,
      () => {
        calls.push(locale)
        const resource = resources[locale]
        return resource
          ? Promise.resolve({ default: resource })
          : Promise.reject(new Error(`no ${locale}`))
      },
    ]),
  ) as NamespaceImporters

  return { calls, importers }
}

describe('createLazyNamespace', () => {
  it('adds the requested language to the instance', async () => {
    const instance = instanceWith('de')
    const { importers } = importersFor({ de: { hello: 'Hallo' }, en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)

    await namespace.load('de', { instance })

    expect(instance.t('hello', { lng: 'de', ns: 'feature' })).toBe('Hallo')
  })

  it('loads English alongside another language, so a gap falls back rather than showing a key', async () => {
    const instance = instanceWith('fr')
    const { calls, importers } = importersFor({ en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } })
    const namespace = createLazyNamespace('feature', importers)

    await namespace.load('fr', { instance })

    expect(calls.sort()).toEqual(['en', 'fr'])
  })

  it('asks for English only when English is the language', async () => {
    const instance = instanceWith('en')
    const { calls, importers } = importersFor({ en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)

    await namespace.load('en', { instance })

    expect(calls).toEqual(['en'])
  })

  it('imports a language once however many times it is asked for', async () => {
    const instance = instanceWith('de')
    const { calls, importers } = importersFor({ de: { hello: 'Hallo' }, en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)

    await Promise.all([namespace.load('de', { instance }), namespace.load('de', { instance })])
    await namespace.load('de', { instance })

    expect(calls.filter((locale) => locale === 'de')).toEqual(['de'])
  })

  it('lets a failed load be tried again rather than caching the failure', async () => {
    const instance = instanceWith('es')
    const { calls, importers } = importersFor({ en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)

    await expect(namespace.load('es', { instance })).rejects.toThrow('no es')
    await expect(namespace.load('es', { instance })).rejects.toThrow('no es')

    expect(calls.filter((locale) => locale === 'es')).toEqual(['es', 'es'])
  })

  it('falls back to English for a language it does not support', async () => {
    const instance = instanceWith('en')
    const { calls, importers } = importersFor({ en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)

    await namespace.load('kl', { instance })

    expect(calls).toEqual(['en'])
  })
})

describe('loadActiveNamespaces', () => {
  it('brings a namespace a feature already asked for into a new language', async () => {
    const instance = instanceWith('en')
    const { importers } = importersFor({
      de: { hello: 'Hallo' },
      en: { hello: 'Hello' },
    })
    const namespace = createLazyNamespace('feature', importers)
    await namespace.load('en', { instance })

    await loadActiveNamespaces('de')
    await namespace.load('de', { instance })

    expect(instance.t('hello', { lng: 'de', ns: 'feature' })).toBe('Hallo')
  })

  it('does nothing for a namespace no feature has asked for', async () => {
    const { calls, importers } = importersFor({ en: {} })
    createLazyNamespace('feature', importers)

    await loadActiveNamespaces('de')

    expect(calls).toEqual([])
  })

  it('ignores a language it does not support', async () => {
    const instance = instanceWith('en')
    const { calls, importers } = importersFor({ en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)
    await namespace.load('en', { instance })
    calls.length = 0

    await loadActiveNamespaces('kl')

    expect(calls).toEqual([])
  })

  it('reports a failure to the caller rather than swallowing it', async () => {
    const instance = instanceWith('en')
    const { importers } = importersFor({ en: { hello: 'Hello' } })
    const namespace = createLazyNamespace('feature', importers)
    await namespace.load('en', { instance })

    await expect(loadActiveNamespaces('de')).rejects.toThrow('no de')
  })
})

describe('the real namespaces', () => {
  it('loads the sequencer text on request', async () => {
    const { loadSequencerNamespace, sequencerNamespace } = await import('./sequencer')
    const instance = instanceWith('en')

    await loadSequencerNamespace('en', { instance })

    expect(instance.t('title', { lng: 'en', ns: sequencerNamespace })).toBe('Sequencer')
  })

  it('loads the editor help text on request', async () => {
    const { editorHelpNamespace, loadEditorHelpNamespace } = await import('./editor-help')
    const instance = instanceWith('en')

    await loadEditorHelpNamespace('en', { instance })

    expect(
      instance.t('controlHelp.pitchEnvelope', { lng: 'en', ns: editorHelpNamespace }),
    ).toContain('pitch')
  })
})

describe('an unavailable importer', () => {
  it('resolves without adding a bundle rather than throwing', async () => {
    const instance = instanceWith('en')
    const namespace = createLazyNamespace('feature', importersFor({ en: {} }).importers)

    await namespace.load('en', { importers: {}, instance })

    expect(instance.hasResourceBundle('en', 'feature')).toBe(false)
    expect(vi.isMockFunction(instance.t)).toBe(false)
  })
})
