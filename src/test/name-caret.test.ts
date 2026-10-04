import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/* jsdom does not draw carets, so this checks the stylesheet asks for the DX7's block. */
describe('name cursor', () => {
  it('draws the cursor in patch and bank name fields as a block', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')

    expect(css).toMatch(/\.name-caret\s*\{\s*caret-shape:\s*block;\s*\}/)
  })
})
