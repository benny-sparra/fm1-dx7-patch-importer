import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { LANGUAGE_STORAGE_KEY, resolveLocale, type SupportedLocale } from './locale'
import { resources } from './resources'

function readStoredLocale() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

const initialLocale = resolveLocale(
  readStoredLocale(),
  typeof navigator === 'undefined' ? [] : navigator.languages,
)

void i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false },
    lng: initialLocale,
    resources,
    returnEmptyString: false,
    supportedLngs: ['en', 'fr', 'es', 'de', 'pt-BR', 'zh-Hans'],
  })

function applyDocumentLanguage(locale: string) {
  document.documentElement.lang = locale
  document.title = i18n.t('meta.title')
  document.querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'))
}

if (typeof document !== 'undefined') {
  applyDocumentLanguage(initialLocale)
  i18n.on('languageChanged', applyDocumentLanguage)
}

export async function setLocale(locale: SupportedLocale) {
  await i18n.changeLanguage(locale)
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
  } catch {
    // The selected language still applies when storage is unavailable.
  }
}

export default i18n
