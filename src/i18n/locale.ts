export const supportedLocales = ['en', 'fr', 'es', 'de', 'pt-BR', 'zh-Hans'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const localeNames: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  'zh-Hans': '简体中文',
}

export const LANGUAGE_STORAGE_KEY = 'fm1-language'

const normalizedLocales: Record<string, SupportedLocale> = {
  de: 'de',
  en: 'en',
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

export function resolveLocale(
  storedLocale: string | null | undefined,
  browserLocales: readonly string[],
): SupportedLocale {
  const stored = normalizeLocale(storedLocale)
  if (stored) return stored

  for (const locale of browserLocales) {
    const supported = normalizeLocale(locale)
    if (supported) return supported
  }

  return 'en'
}
