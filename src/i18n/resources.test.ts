import { describe, expect, it } from 'vitest'

import de from './locales/de'
import britishEnglish from './locales/en-GB'
import britishEnglishEditorHelp from './locales/en-GB-editor-help'
import britishEnglishLibrarianDialogs from './locales/en-GB-librarian-dialogs'
import enUS from './locales/en-US'
import es from './locales/es'
import fr from './locales/fr'
import ptBR from './locales/pt-BR'
import uk from './locales/uk'
import zhHans from './locales/zh-Hans'

type Strings = { [key: string]: string | Strings }

function mergeStrings<T extends object, U extends object>(target: T, source: U): T & U {
  const merged: Strings = { ...(target as Strings) }
  for (const [key, value] of Object.entries(source as Strings)) {
    const current = merged[key]
    merged[key] =
      typeof value === 'object' && typeof current === 'object'
        ? mergeStrings(current, value)
        : value
  }
  return merged as T & U
}

// British English strings that load with the lazy chunks that show them, each with the module that
// adds it and one module known to read it.
const lazyBritishEnglish = [
  {
    module: '@/i18n/editor-help',
    reader: '/src/routes/patch-editor-page.tsx',
    strings: britishEnglishEditorHelp,
  },
  {
    module: '@/i18n/librarian-dialogs',
    reader: '/src/components/patches/write-fm1-va-presets-dialog.tsx',
    strings: britishEnglishLibrarianDialogs,
  },
]

// British English as a page sees it once every lazy chunk has added its strings.
const en = mergeStrings(
  mergeStrings(britishEnglish, britishEnglishEditorHelp),
  britishEnglishLibrarianDialogs,
)

const resources = {
  de: { translation: de },
  en: { translation: en },
  'en-US': { translation: enUS },
  es: { translation: es },
  fr: { translation: fr },
  'pt-BR': { translation: ptBR },
  uk: { translation: uk },
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

    for (const locale of ['de', 'es', 'fr', 'pt-BR', 'uk', 'zh-Hans'] as const) {
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

  // Ukrainian counts in three forms where English has two: the key itself holds the form for 1,
  // 21, and 31, `_few` the form for 2 to 4, and `_many` the form for 0 and 5 to 20.
  it('provides every English key in Ukrainian, with its extra plural forms', () => {
    const englishKeys = flattenKeys(resources.en.translation)
    const ukrainianKeys = englishKeys.flatMap((key) =>
      key.endsWith('_other')
        ? [key, key.replace(/_other$/, '_few'), key.replace(/_other$/, '_many')]
        : [key],
    )

    expect(flattenKeys(resources.uk.translation).sort()).toEqual(ukrainianKeys.sort())
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
      /(favourit|colour|organis|synthesiser|minimis|maximis|randomis|behaviour|centre|catalogue|analys(e|ed|ing)\b|analogue|recognis|normalis|initialis|customis|optimis|visualis|licence|grey|travell|cancell|labell|modell|programme\b)/i
    const american = new Map(flattenStrings(resources['en-US'].translation))
    // Interpolation names such as {{colour}} are code, not text a reader sees.
    const spelling = (text: string) => text.replace(/\{\{[^}]*\}\}/g, '')

    const unchanged = flattenStrings(resources.en.translation)
      .map(([key, text]): [string, string] => [key, american.get(key) ?? text])
      .filter(([, text]) => british.test(spelling(text)))
      .map(([key]) => key)

    expect(unchanged).toEqual([])
  })

  // Strings that load with a lazy chunk must stay out of the page's English, and a module that reads
  // one must bring them. A key read through a template, such as `controlHelp.${id}`, counts by the
  // part before the placeholder.
  describe.each(lazyBritishEnglish)('strings added by $module', ({ module, reader, strings }) => {
    const lazyKeys = flattenKeys(strings)

    it('leaves them out of the page’s English', () => {
      const pageKeys = new Set(flattenKeys(britishEnglish))

      expect(lazyKeys.filter((key) => pageKeys.has(key))).toEqual([])
    })

    it('is imported by every module that reads them', () => {
      const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.*'], {
        eager: true,
        import: 'default',
        query: '?raw',
      })
      const sections = Object.keys(strings).join('|')
      const keyReference = new RegExp(`['"\`]((?:${sections})\\.[^'"\`$\\n]*)(['"\`]|\\$)`, 'g')
      const readsLazyKey = (reference: string, end: string) =>
        lazyKeys.some((key) =>
          end === '$'
            ? key.startsWith(reference)
            : key === reference ||
              key.startsWith(`${reference}_`) ||
              key.startsWith(`${reference}.`),
        )
      const readers = Object.entries(sources).filter(
        ([path, source]) =>
          !path.startsWith('/src/i18n/') &&
          [...source.matchAll(keyReference)].some(([, reference, end]) =>
            readsLazyKey(reference, end),
          ),
      )
      const missingImport = readers
        .filter(([, source]) => !source.includes(`import '${module}'`))
        .map(([path]) => path)

      expect(readers.map(([path]) => path)).toContain(reader)
      expect(missingImport).toEqual([])
    })
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
    expect(resources.de.translation.namedBanks.loadBank).toBe('Bank laden…')
    expect(resources['pt-BR'].translation.namedBanks.deleteAction).toBe('Excluir banco')
    expect(resources.uk.translation.namedBanks.title).toBe('Мої збережені банки')
    expect(resources['zh-Hans'].translation.namedBanks.search).toBe('搜索已保存的音色库')
  })
})
