import axe, { type ElementContext } from 'axe-core'
import { expect } from 'vitest'

export async function expectNoAxeViolations(context: ElementContext) {
  const result = await axe.run(context, {
    rules: {
      // jsdom has no layout engine; contrast remains a Lighthouse/manual check.
      'color-contrast': { enabled: false },
    },
  })

  expect(result.violations).toEqual([])
}
