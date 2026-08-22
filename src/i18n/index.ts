import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { LANGUAGE_STORAGE_KEY, resolveLocale, type SupportedLocale } from './locale'
import english from './locales/en'

type TranslationResource = Record<string, unknown>
type LocaleModule = { default: TranslationResource }
type LocaleImporter = () => Promise<LocaleModule>

const localeImporters: Record<Exclude<SupportedLocale, 'en'>, LocaleImporter> = {
  de: () => import('./locales/de'),
  es: () => import('./locales/es'),
  fr: () => import('./locales/fr'),
  'pt-BR': () => import('./locales/pt-BR'),
  'zh-Hans': () => import('./locales/zh-Hans'),
}

function readStoredLocale(storage: Pick<Storage, 'getItem'> | undefined) {
  try {
    return storage?.getItem(LANGUAGE_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function getBrowserStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function applyDocumentLanguage(locale: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.title = i18n.t('meta.title')
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'))
}

type LocaleControllerOptions = {
  browserLocales?: readonly string[]
  importers?: Partial<Record<Exclude<SupportedLocale, 'en'>, LocaleImporter>>
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

export function createLocaleController(
  instance: typeof i18n,
  {
    browserLocales = typeof navigator === 'undefined' ? [] : navigator.languages,
    importers = localeImporters,
    storage = getBrowserStorage(),
  }: LocaleControllerOptions = {},
) {
  const loaded = new Map<SupportedLocale, TranslationResource>([['en', english]])
  const pending = new Map<SupportedLocale, Promise<TranslationResource>>()
  let latestRequest = 0
  let applyQueue = Promise.resolve()

  const loadLocale = (locale: SupportedLocale) => {
    const completed = loaded.get(locale)
    if (completed) return Promise.resolve(completed)

    const inFlight = pending.get(locale)
    if (inFlight) return inFlight

    const importer = locale === 'en' ? undefined : importers[locale]
    if (!importer) return Promise.reject(new Error(`No resources are available for ${locale}.`))

    const loading = importer()
      .then((module) => {
        loaded.set(locale, module.default)
        pending.delete(locale)
        return module.default
      })
      .catch((error: unknown) => {
        pending.delete(locale)
        throw error
      })
    pending.set(locale, loading)
    return loading
  }

  const queueLanguageChange = (request: number, locale: SupportedLocale) => {
    const apply = async () => {
      if (request !== latestRequest) return false
      const resource = loaded.get(locale)
      if (!resource) return false
      if (!instance.hasResourceBundle(locale, 'translation')) {
        instance.addResourceBundle(locale, 'translation', resource)
      }
      await instance.changeLanguage(locale)
      return request === latestRequest
    }
    const result = applyQueue.then(apply, apply)
    applyQueue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const initialize = async () => {
    const requestedLocale = resolveLocale(readStoredLocale(storage), browserLocales)
    let initialLocale = requestedLocale
    if (requestedLocale !== 'en') {
      try {
        await loadLocale(requestedLocale)
      } catch {
        initialLocale = 'en'
      }
    }

    const resources = Object.fromEntries(
      [...loaded].map(([locale, translation]) => [locale, { translation }]),
    )
    await instance.use(initReactI18next).init({
      fallbackLng: 'en',
      initAsync: false,
      interpolation: { escapeValue: false },
      lng: initialLocale,
      resources,
      returnEmptyString: false,
      supportedLngs: ['en', 'fr', 'es', 'de', 'pt-BR', 'zh-Hans'],
    })
    return initialLocale
  }

  const setLocale = async (locale: SupportedLocale) => {
    const request = ++latestRequest
    const previousLocale = (instance.resolvedLanguage ?? 'en') as SupportedLocale
    try {
      await loadLocale(locale)
      const applied = await queueLanguageChange(request, locale)
      if (!applied) return false
      try {
        storage?.setItem(LANGUAGE_STORAGE_KEY, locale)
      } catch {
        // The selected language still applies when storage is unavailable.
      }
      return true
    } catch {
      await queueLanguageChange(request, previousLocale)
      return false
    }
  }

  return { initialize, loadLocale, setLocale }
}

const localeController = createLocaleController(i18n)
export const i18nReady = localeController.initialize().then((locale) => {
  applyDocumentLanguage(locale)
  i18n.on('languageChanged', applyDocumentLanguage)
})

export const setLocale = localeController.setLocale
