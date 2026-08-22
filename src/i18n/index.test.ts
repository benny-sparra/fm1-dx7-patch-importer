import { createInstance } from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import { createLocaleController } from './index'

type TestResource = { meta: { description: string; title: string }; value: string }

const french = {
  meta: { description: 'Description française', title: 'Titre français' },
  value: 'Français',
} satisfies TestResource
const german = {
  meta: { description: 'Deutsche Beschreibung', title: 'Deutscher Titel' },
  value: 'Deutsch',
} satisfies TestResource

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function makeController({
  browserLocales = ['en'],
  de = async () => ({ default: german }),
  fr = async () => ({ default: french }),
  storedLocale = null,
}: {
  browserLocales?: string[]
  de?: () => Promise<{ default: TestResource }>
  fr?: () => Promise<{ default: TestResource }>
  storedLocale?: string | null
} = {}) {
  const instance = createInstance()
  const storage = {
    getItem: vi.fn(() => storedLocale),
    setItem: vi.fn(),
  }
  const controller = createLocaleController(instance, {
    browserLocales,
    importers: { de, fr },
    storage,
  })
  return { controller, instance, storage }
}

describe('locale resource loading', () => {
  it('starts with only English when English is resolved', async () => {
    const fr = vi.fn(async () => ({ default: french }))
    const { controller, instance } = makeController({ fr })

    await controller.initialize()

    expect(instance.t('root.subtitle')).toBe('editor & librarian')
    expect(instance.hasResourceBundle('en', 'translation')).toBe(true)
    expect(instance.hasResourceBundle('fr', 'translation')).toBe(false)
    expect(fr).not.toHaveBeenCalled()
  })

  it('loads a resolved non-English locale before initialization completes', async () => {
    const loadingFrench = deferred<{ default: TestResource }>()
    const { controller, instance } = makeController({
      browserLocales: ['fr-FR'],
      fr: () => loadingFrench.promise,
    })

    const initializing = controller.initialize()
    expect(instance.isInitialized).not.toBe(true)

    loadingFrench.resolve({ default: french })
    await initializing

    expect(instance.resolvedLanguage).toBe('fr')
    expect(instance.t('value')).toBe('Français')
  })

  it('loads a switched locale before changing the usable language', async () => {
    const loadingFrench = deferred<{ default: TestResource }>()
    const { controller, instance } = makeController({ fr: () => loadingFrench.promise })
    await controller.initialize()

    const switching = controller.setLocale('fr')
    expect(instance.resolvedLanguage).toBe('en')

    loadingFrench.resolve({ default: french })
    await switching

    expect(instance.resolvedLanguage).toBe('fr')
    expect(instance.t('value')).toBe('Français')
  })

  it('keeps the current language when a locale chunk fails', async () => {
    const { controller, instance, storage } = makeController({
      fr: async () => {
        throw new Error('chunk unavailable')
      },
    })
    await controller.initialize()

    await expect(controller.setLocale('fr')).resolves.toBe(false)

    expect(instance.resolvedLanguage).toBe('en')
    expect(instance.t('root.subtitle')).toBe('editor & librarian')
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('prevents an older slow locale request from winning', async () => {
    const loadingFrench = deferred<{ default: TestResource }>()
    const loadingGerman = deferred<{ default: TestResource }>()
    const { controller, instance } = makeController({
      de: () => loadingGerman.promise,
      fr: () => loadingFrench.promise,
    })
    await controller.initialize()

    const switchToFrench = controller.setLocale('fr')
    const switchToGerman = controller.setLocale('de')
    loadingGerman.resolve({ default: german })
    await switchToGerman
    loadingFrench.resolve({ default: french })
    await switchToFrench

    expect(instance.resolvedLanguage).toBe('de')
    expect(instance.t('value')).toBe('Deutsch')
  })

  it('deduplicates in-flight and completed locale imports', async () => {
    const loadingFrench = deferred<{ default: TestResource }>()
    const fr = vi.fn(() => loadingFrench.promise)
    const { controller } = makeController({ fr })
    await controller.initialize()

    const first = controller.loadLocale('fr')
    const second = controller.loadLocale('fr')
    loadingFrench.resolve({ default: french })
    await Promise.all([first, second])
    await controller.loadLocale('fr')

    expect(fr).toHaveBeenCalledOnce()
  })
})
