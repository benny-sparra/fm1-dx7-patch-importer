import { readFile } from 'node:fs/promises'

import stylelint from 'stylelint'
import { beforeAll, describe, expect, it } from 'vitest'

let stylelintConfig: Record<string, unknown>

beforeAll(async () => {
  stylelintConfig = JSON.parse(
    await readFile(new URL('../../.stylelintrc.json', import.meta.url), 'utf8'),
  ) as Record<string, unknown>
})

async function lintSelector(selector: string) {
  const result = await stylelint.lint({
    code: `${selector} { color: red; }`,
    config: stylelintConfig,
  })

  return result.results[0]?.warnings ?? []
}

describe('theme CSS architecture lint guard', () => {
  it("rejects selectors that inspect an element's class attribute", async () => {
    const warnings = await lintSelector("[data-theme='dx7'] [class~='text-4xl']")

    expect(warnings.some(({ rule }) => rule === 'selector-disallowed-list')).toBe(true)
  })

  it('rejects generated colour utility selectors', async () => {
    const warnings = await lintSelector("[data-theme='dx7'] .text-white\\/65")

    expect(warnings.some(({ rule }) => rule === 'selector-disallowed-list')).toBe(true)
  })

  it('rejects generated radius utility selectors', async () => {
    const warnings = await lintSelector("[data-theme='dx7'] .rounded-xl")

    expect(warnings.some(({ rule }) => rule === 'selector-disallowed-list')).toBe(true)
  })

  it('rejects generated shadow utility selectors', async () => {
    const warnings = await lintSelector("[data-theme='dx7'] .shadow-2xl")

    expect(warnings.some(({ rule }) => rule === 'selector-disallowed-list')).toBe(true)
  })

  it('rejects escaped arbitrary-value utility selectors', async () => {
    const warnings = await lintSelector("[data-theme='dx7'] .\\[mask-type\\:luminance\\]")

    expect(warnings.some(({ rule }) => rule === 'selector-disallowed-list')).toBe(true)
  })

  it('accepts semantic component, theme, colourway, ARIA, and range selectors', async () => {
    const warnings = await lintSelector(`
      :root[data-theme='dx7'] .operator-tab[aria-selected='true'],
      :root[data-fm1-colorway='purple'] .patch-slot[aria-pressed='true'],
      :root[data-theme='dx7'] input[type='range']::-webkit-slider-thumb
    `)

    expect(warnings).toHaveLength(0)
  })
})
