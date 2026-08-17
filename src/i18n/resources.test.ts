import { describe, expect, it } from 'vitest'

import { resources } from './resources'

function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'object' && child !== null
      ? flattenKeys(child, path)
      : [path]
  })
}

describe('translation resources', () => {
  it('provides every English key in every supported locale', () => {
    const englishKeys = flattenKeys(resources.en.translation).sort()

    expect(flattenKeys(resources.fr.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.es.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources.de.translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['pt-BR'].translation).sort()).toEqual(englishKeys)
    expect(flattenKeys(resources['zh-Hans'].translation).sort()).toEqual(englishKeys)
  })

  it('provides Simplified Chinese text for editor help tooltips', () => {
    const chinese = resources['zh-Hans'].translation

    expect(chinese.controlHelp.pitchEnvelopeRate).toBe('控制音高移动到此阶段的速度。数值越高，移动越快。')
    expect(chinese.effectHelp.Reverb).toBe('加入模拟空间反射，让声音具有空间感和距离感。')
    expect(chinese.effectParameterHelp['Filter Cutoff']).toBe('设置滤波开始作用的频率。听感上的变化方向取决于所选滤波器类型。')
  })

  it('provides localized text for saved-bank dialogs', () => {
    expect(resources.fr.translation.namedBanks.title).toBe('Mes banques enregistrées')
    expect(resources.es.translation.namedBanks.save).toBe('Guardar banco')
    expect(resources.de.translation.namedBanks.loadBank).toBe('Bank laden')
    expect(resources['pt-BR'].translation.namedBanks.deleteAction).toBe('Excluir banco')
    expect(resources['zh-Hans'].translation.namedBanks.search).toBe('搜索已保存的音色库')
  })
})
