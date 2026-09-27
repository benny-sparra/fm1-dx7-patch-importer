export const supportedLocales = ['en-GB', 'en-US', 'fr', 'es', 'de', 'pt-BR', 'zh-Hans'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const localeNames: Record<SupportedLocale, string> = {
  'en-GB': 'English (UK)',
  'en-US': 'English (US)',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  'zh-Hans': '简体中文',
}

export const LANGUAGE_STORAGE_KEY = 'fm1-language'

const normalizedLocales: Record<string, SupportedLocale> = {
  de: 'de',
  // English in any region spells as British English, apart from the regions listed with en-US.
  en: 'en-GB',
  'en-as': 'en-US',
  'en-gu': 'en-US',
  'en-mp': 'en-US',
  'en-ph': 'en-US',
  'en-pr': 'en-US',
  'en-um': 'en-US',
  'en-us': 'en-US',
  'en-vi': 'en-US',
  es: 'es',
  fr: 'fr',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-hans-cn': 'zh-Hans',
  'zh-hans-sg': 'zh-Hans',
  'zh-hk': 'zh-Hans',
  'zh-mo': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-tw': 'zh-Hans',
  'pt-pt': 'pt-BR',
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale | null {
  if (!locale) return null

  const normalized = locale.trim().replaceAll('_', '-').toLowerCase()
  if (!normalized) return null

  return normalizedLocales[normalized] ?? normalizedLocales[normalized.split('-')[0]] ?? null
}

/** Whether a locale is one of the English variants. */
function isEnglishLocale(locale: SupportedLocale) {
  return locale === 'en-GB' || locale === 'en-US'
}

export function resolveLocale(
  storedLocale: string | null | undefined,
  browserLocales: readonly string[],
): SupportedLocale {
  const browserLocale = browserLocales.map(normalizeLocale).find((locale) => locale !== null)

  // Releases before the two Englishes stored plain 'en' for English, which chose no spelling, so
  // the browser's own English decides it.
  if (storedLocale?.trim().toLowerCase() === 'en') {
    return browserLocale && isEnglishLocale(browserLocale) ? browserLocale : 'en-GB'
  }
  return normalizeLocale(storedLocale) ?? browserLocale ?? 'en-GB'
}
