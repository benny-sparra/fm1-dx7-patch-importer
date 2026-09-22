// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import '@/i18n'
import { SearchEverywhereResults } from '@/components/patches/search-everywhere-results'

// A tab left open across a deploy cannot load the search code any more.
vi.mock('@/lib/search-everywhere', () => {
  throw new TypeError('Failed to fetch dynamically imported module')
})

afterEach(() => {
  cleanup()
})

it('explains a search that could not load and offers a reload', async () => {
  render(
    <SearchEverywhereResults
      activePatchId=""
      hasDamagedNamedBanks={false}
      namedBanks={[]}
      namedBanksLoadFailed={false}
      onCopy={vi.fn()}
      onPlay={vi.fn()}
      search="brass"
      workspaceEffects={{}}
      workspaceMatches={[]}
      workspaceVoices={{}}
    />,
  )

  const notice = await screen.findByRole('alert')

  expect(notice.textContent).toContain(
    'Saved banks and other DX7 patch banks could not be searched. Reload the page and try again.',
  )
  expect(screen.getByRole('button', { name: 'Reload app' })).toBeTruthy()
})
