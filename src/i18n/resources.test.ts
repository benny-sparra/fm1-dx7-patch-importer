import { describe, expect, it } from 'vitest'

import de from './locales/de'
import en from './locales/en-GB'
import enUS from './locales/en-US'
import es from './locales/es'
import fr from './locales/fr'
import ptBR from './locales/pt-BR'
import zhHans from './locales/zh-Hans'

const resources = {
  de: { translation: de },
  en: { translation: en },
  'en-US': { translation: enUS },
  es: { translation: es },
  fr: { translation: fr },
  'pt-BR': { translation: ptBR },
  'zh-Hans': { translation: zhHans },
}

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

  // The header links the marked words to the DX7 bank sources.
  it('marks one link in the intro of every locale', () => {
    const unmarked = Object.entries(resources)
      .filter(
        ([, { translation }]) => !/^[^<>]*<link>[^<>]+<\/link>[^<>]*$/.test(translation.root.intro),
      )
      .map(([locale]) => locale)

    expect(unmarked).toEqual([])
  })

  it('provides every English key in every supported locale', () => {
    const englishKeys = flattenKeys(resources.en.translation).sort()

    expect(flattenKeys(resources.fr.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.es.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.de.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['pt-BR'].translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['zh-Hans'].translation).sort()).toEqual(englishKeys)
  })

  // American English holds only overrides; i18next reads everything else from British English.
  it('overrides only strings British English has, each with different text', () => {
    const british = new Map(flattenStrings(resources.en.translation))
    const american = flattenStrings(resources['en-US'].translation)

    expect(american.filter(([key]) => !british.has(key)).map(([key]) => key)).toEqual([])
    expect(american.filter(([key, text]) => british.get(key) === text).map(([key]) => key)).toEqual(
      [],
    )
  })

  it('gives American English its own spelling of every British English word', () => {
    const british =
      /(favourit|colour|organis|synthesiser|minimis|maximis|randomis|behaviour|centre|catalogue|analys(e|ed|ing)\b|recognis|normalis|initialis|customis|optimis|visualis|licence|grey|travell|cancell|labell|modell|programme\b)/i
    const american = new Map(flattenStrings(resources['en-US'].translation))
    // Interpolation names such as {{colour}} are code, not text a reader sees.
    const spelling = (text: string) => text.replace(/\{\{[^}]*\}\}/g, '')

    const unchanged = flattenStrings(resources.en.translation)
      .map(([key, text]): [string, string] => [key, american.get(key) ?? text])
      .filter(([, text]) => british.test(spelling(text)))
      .map(([key]) => key)

    expect(unchanged).toEqual([])
  })

  it('provides Simplified Chinese text for editor help tooltips', () => {
    const chinese = resources['zh-Hans'].translation

    expect(chinese.controlHelp.pitchEnvelope).toBe(
      '控制每个音符发声过程中的音高变化。四个速率决定各阶段的变化速度，四个电平决定各阶段到达的音高。',
    )
    expect(chinese.effectHelp.Reverb).toBe('加入模拟空间反射，让声音具有空间感和距离感。')
    expect(chinese.effectParameterHelp['Filter Cutoff']).toBe(
      '设置滤波开始作用的频率，从 0 时约 100 Hz 到 107 时约 20 kHz。听感上的变化方向取决于所选滤波器类型。',
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
