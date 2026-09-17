import i18n from 'i18next'

import { supportedLocales, type SupportedLocale } from './locale'

/**
 * Translations that load with the feature that needs them instead of with the application shell.
 *
 * Almost every string belongs in the eager `translation` namespace, where English is the dependable
 * fallback. A namespace here is for text that only a lazily loaded view ever reads and that is
 * large enough to matter in the initial bundle: the patch editor's help text and the sequencer.
 * Both arrive with their view, and English is always loaded alongside the chosen language so a
 * missing locale falls back to English rather than to raw key names.
 */

type NamespaceResource = Record<string, unknown>
type NamespaceImporter = () => Promise<{ default: NamespaceResource }>
export type NamespaceImporters = Record<SupportedLocale, NamespaceImporter>

export type LazyNamespaceOptions = {
  importers?: Partial<NamespaceImporters>
  instance?: typeof i18n
}

type ActiveNamespace = (locale: SupportedLocale) => Promise<void>

const activeNamespaces = new Set<ActiveNamespace>()

function isSupported(locale: string): locale is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(locale)
}

export function createLazyNamespace(namespace: string, defaultImporters: NamespaceImporters) {
  const loads = new Map<string, Promise<void>>()

  const loadOne = (
    locale: SupportedLocale,
    instance: typeof i18n,
    importers: Partial<NamespaceImporters>,
  ) => {
    if (instance.hasResourceBundle(locale, namespace)) return Promise.resolve()

    const cached = loads.get(locale)
    if (cached) return cached

    const importer = importers[locale]
    if (!importer) return Promise.resolve()

    const loading = importer()
      .then((module) => {
        instance.addResourceBundle(locale, namespace, module.default, true, true)
      })
      .catch((error: unknown) => {
        // Let the next attempt try again rather than caching a rejected promise forever.
        loads.delete(locale)
        throw error
      })

    loads.set(locale, loading)
    return loading
  }

  const load = (
    locale: string | undefined = i18n.resolvedLanguage,
    { importers = defaultImporters, instance = i18n }: LazyNamespaceOptions = {},
  ) => {
    const requested = locale && isSupported(locale) ? locale : 'en'
    const wanted: SupportedLocale[] = requested === 'en' ? ['en'] : ['en', requested]

    // Once a feature has asked for its text, a later language change has to bring it along, or the
    // view would drop back to English while the rest of the interface changed language.
    activeNamespaces.add((next) => load(next, { importers, instance }))

    return Promise.all(wanted.map((one) => loadOne(one, instance, importers))).then(() => undefined)
  }

  return { load, namespace, reset: () => loads.clear() }
}

/**
 * Loads every namespace a feature has already asked for in another language, so switching language
 * does not leave an open view in the previous one.
 */
export function loadActiveNamespaces(locale: string) {
  if (!isSupported(locale)) return Promise.resolve()
  return Promise.all([...activeNamespaces].map((load) => load(locale))).then(() => undefined)
}

/** Test seam: forgets which namespaces have been asked for. */
export function resetActiveNamespaces() {
  activeNamespaces.clear()
}
