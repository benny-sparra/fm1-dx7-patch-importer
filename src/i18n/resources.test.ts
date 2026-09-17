import { describe, expect, it } from 'vitest'

import editorHelpDe from './editor-help/de'
import editorHelpEn from './editor-help/en'
import editorHelpEs from './editor-help/es'
import editorHelpFr from './editor-help/fr'
import editorHelpPtBR from './editor-help/pt-BR'
import editorHelpZhHans from './editor-help/zh-Hans'
import sequencerDe from './sequencer/de'
import sequencerEn from './sequencer/en'
import sequencerEs from './sequencer/es'
import sequencerFr from './sequencer/fr'
import sequencerPtBR from './sequencer/pt-BR'
import sequencerZhHans from './sequencer/zh-Hans'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import ptBR from './locales/pt-BR'
import zhHans from './locales/zh-Hans'

const resources = {
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  'pt-BR': { translation: ptBR },
  'zh-Hans': { translation: zhHans },
}

/**
 * The namespaces that travel with a lazily loaded view. They carry the same obligations as the
 * eager namespace: every locale holds every key, and no locale leaves English text in place.
 */
const lazyNamespaces = {
  editorHelp: {
    de: editorHelpDe,
    en: editorHelpEn,
    es: editorHelpEs,
    fr: editorHelpFr,
    'pt-BR': editorHelpPtBR,
    'zh-Hans': editorHelpZhHans,
  },
  sequencer: {
    de: sequencerDe,
    en: sequencerEn,
    es: sequencerEs,
    fr: sequencerFr,
    'pt-BR': sequencerPtBR,
    'zh-Hans': sequencerZhHans,
  },
} as const

const otherLocales = ['de', 'es', 'fr', 'pt-BR', 'zh-Hans'] as const

function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'object' && child !== null ? flattenKeys(child, path) : [path]
  })
}

function flattenStrings(value: object, prefix = ''): [string, string][] {
  return Object.entries(value).flatMap(([key, child]): [string, string][] => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') return [[path, child]]
    return typeof child === 'object' && child !== null ? flattenStrings(child, path) : []
  })
}

const wordCount = (text: string) =>
  text
    .replace(/\{\{\w+\}\}/g, '')
    .trim()
    .split(/\s+/).length

describe('translation resources', () => {
  // Short labels such as "Chorus" or "Solo" can be the same word in another language, but a
  // sentence copied from English means the text was never translated.
  it('does not reuse English sentences in other locales', () => {
    const english = flattenStrings(resources.en.translation).filter(
      ([, text]) => wordCount(text) >= 5,
    )

    for (const locale of ['de', 'es', 'fr', 'pt-BR', 'zh-Hans'] as const) {
      const localized = new Map(flattenStrings(resources[locale].translation))
      const copied = english
        .filter(([key, text]) => localized.get(key) === text)
        .map(([key]) => key)

      expect(copied, `${locale} copies English text`).toEqual([])
    }
  })

  it.each(Object.keys(lazyNamespaces) as (keyof typeof lazyNamespaces)[])(
    'provides every English key of the %s namespace in every supported locale',
    (namespace) => {
      const englishKeys = flattenKeys(lazyNamespaces[namespace].en).sort()

      otherLocales.forEach((locale) => {
        expect({ locale, keys: flattenKeys(lazyNamespaces[namespace][locale]).sort() }).toEqual({
          locale,
          keys: englishKeys,
        })
      })
    },
  )

  it.each(Object.keys(lazyNamespaces) as (keyof typeof lazyNamespaces)[])(
    'does not reuse English sentences in the %s namespace',
    (namespace) => {
      const english = flattenStrings(lazyNamespaces[namespace].en).filter(
        ([, text]) => wordCount(text) >= 5,
      )

      otherLocales.forEach((locale) => {
        const localized = new Map(flattenStrings(lazyNamespaces[namespace][locale]))
        const copied = english
          .filter(([key, text]) => localized.get(key) === text)
          .map(([key]) => key)

        expect(copied, `${locale} copies English text`).toEqual([])
      })
    },
  )

  it('keeps the lazy namespaces out of the eager one', () => {
    const eagerKeys = new Set(flattenKeys(resources.en.translation))
    const lazyKeys = Object.values(lazyNamespaces).flatMap((namespace) => flattenKeys(namespace.en))

    expect(lazyKeys.filter((key) => eagerKeys.has(key))).toEqual([])
  })

  it('provides every English key in every supported locale', () => {
    const englishKeys = flattenKeys(resources.en.translation).sort()

    expect(flattenKeys(resources.fr.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.es.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.de.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['pt-BR'].translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['zh-Hans'].translation).sort()).toEqual(englishKeys)
  })

  it('provides Simplified Chinese text for editor help tooltips', () => {
    const chinese = lazyNamespaces.editorHelp['zh-Hans']

    expect(chinese.controlHelp.pitchEnvelope).toBe(
      '控制每个音符发声过程中的音高变化。四个速率决定各阶段的变化速度，四个电平决定各阶段到达的音高。',
    )
    expect(chinese.effectHelp.Reverb).toBe('加入模拟空间反射，让声音具有空间感和距离感。')
    expect(chinese.effectParameterHelp['Filter Cutoff']).toBe(
      '设置滤波开始作用的频率。听感上的变化方向取决于所选滤波器类型。',
    )
  })

  it('provides localized text for saved-bank dialogs', () => {
    expect(resources.fr.translation.namedBanks.title).toBe('Mes banques enregistrées')
    expect(resources.es.translation.namedBanks.save).toBe('Guardar banco')
    expect(resources.de.translation.namedBanks.loadBank).toBe('Bank laden')
    expect(resources['pt-BR'].translation.namedBanks.deleteAction).toBe('Excluir banco')
    expect(resources['zh-Hans'].translation.namedBanks.search).toBe('搜索已保存的音色库')
  })
})
