import i18n from 'i18next'

/**
 * Adds British English strings that load with a lazy chunk rather than with the page. Every locale
 * falls back to British English, so they cover American English too.
 *
 * It reaches i18next directly rather than through `@/i18n`: importing that module from the editor's
 * chunk made the bundler split Button and the Lucide icon code out of the entry, costing 800 B.
 * The app renders only once i18next is ready, but a test can import a lazy module first.
 */
export function addBritishEnglish(resources: object) {
  const add = () => i18n.addResourceBundle('en-GB', 'translation', resources, true, false)
  if (i18n.isInitialized) add()
  else i18n.on('initialized', add)
}
