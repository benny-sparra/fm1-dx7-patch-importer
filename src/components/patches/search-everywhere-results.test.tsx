// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { SearchEverywhereResults } from '@/components/patches/search-everywhere-results'
import { type Dx7Voice, updateDx7VoiceName } from '@/lib/dx7'
import { Dx7CatalogBankUnavailableError } from '@/lib/dx7-bank-catalog'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { translatePageText } from '@/test/page-translator'

const loadDx7CatalogBank = vi.hoisted(() => vi.fn<(bankId: string) => Promise<Dx7Voice[]>>())

vi.mock(import('@/lib/dx7-bank-catalog'), async (importOriginal) => ({
  ...(await importOriginal()),
  loadDx7CatalogBank,
}))

afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  await setLocale('en')
})

const savedEffects = makeDefaultFm1Effects()
savedEffects[3] = 1

function savedBank(firstVoiceName: string) {
  const voices = makeDemoVoices()
  voices[0] = updateDx7VoiceName(voices[0], firstVoiceName)
  const bank = createNamedBank(importVoices(emptyPatchLibrary(), 'A', voices), 'A', {
    description: '',
    id: 'saved-1',
    name: 'Leads',
    now: '2026-09-21T00:00:00.000Z',
  })
  bank.slots[0].effects = savedEffects
  return bank
}

function renderResults(props: Partial<ComponentProps<typeof SearchEverywhereResults>> = {}) {
  const onCopy = vi.fn()
  const onPlay = vi.fn()
  const view = render(
    <SearchEverywhereResults
      activePatchId=""
      hasDamagedNamedBanks={false}
      namedBanks={[]}
      namedBanksLoadFailed={false}
      onCopy={onCopy}
      onPlay={onPlay}
      search="brass   1"
      workspaceEffects={{}}
      workspaceMatches={[]}
      workspaceVoices={{}}
      {...props}
    />,
  )
  return { ...view, onCopy, onPlay, user: userEvent.setup() }
}

const catalogResult = () =>
  screen.findByRole('button', { name: 'Play BRASS 1 from ROM1A Master 01' })

describe('search everywhere results', () => {
  it('lists a patch from another DX7 bank under its own heading', async () => {
    renderResults()

    const catalog = await screen.findByRole('region', { name: 'Other DX7 patch banks' })

    expect(
      within(catalog).getByRole('button', { name: 'Play BRASS 1 from ROM1A Master 01' }),
    ).toBeTruthy()
  })

  it('lists a saved-bank patch under the saved banks heading', async () => {
    renderResults({ namedBanks: [savedBank('SOLO LEAD')], search: 'solo' })

    const saved = await screen.findByRole('region', { name: 'Saved banks' })

    expect(within(saved).getByRole('button', { name: 'Play SOLO LEAD from Leads 01' })).toBeTruthy()
  })

  it('plays a catalog patch without effects of its own', async () => {
    const voices = makeDemoVoices()
    loadDx7CatalogBank.mockResolvedValue(voices)
    const { onPlay, user } = renderResults()

    await user.click(await catalogResult())

    await vi.waitFor(() => expect(onPlay).toHaveBeenCalledExactlyOnceWith(voices[0], undefined))
    expect(loadDx7CatalogBank).toHaveBeenCalledExactlyOnceWith('rom1a')
  })

  it('plays a saved-bank patch with its saved effects', async () => {
    const bank = savedBank('SOLO LEAD')
    const { onPlay, user } = renderResults({ namedBanks: [bank], search: 'solo' })

    await user.click(await screen.findByRole('button', { name: 'Play SOLO LEAD from Leads 01' }))

    await vi.waitFor(() =>
      expect(onPlay).toHaveBeenCalledExactlyOnceWith(bank.slots[0].voice, savedEffects),
    )
  })

  it('marks the played result as auditioning', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { user } = renderResults()

    const result = await catalogResult()
    await user.click(result)

    await vi.waitFor(() => expect(result.getAttribute('aria-current')).toBe('true'))
  })

  it('stops marking a result once a workspace slot is lit', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { rerender, user, onCopy, onPlay } = renderResults()
    const result = await catalogResult()
    await user.click(result)
    await vi.waitFor(() => expect(result.getAttribute('aria-current')).toBe('true'))

    rerender(
      <SearchEverywhereResults
        activePatchId="bank-A-1"
        hasDamagedNamedBanks={false}
        namedBanks={[]}
        namedBanksLoadFailed={false}
        onCopy={onCopy}
        onPlay={onPlay}
        search="brass   1"
        workspaceEffects={{}}
        workspaceMatches={[]}
        workspaceVoices={{}}
      />,
    )

    expect(result.getAttribute('aria-current')).toBeNull()
  })

  it('plays only the latest of two results when the earlier one arrives last', async () => {
    const voices = makeDemoVoices()
    let finishFirst: (voices: Dx7Voice[]) => void = () => undefined
    loadDx7CatalogBank.mockImplementation((bankId) =>
      bankId === 'rom1a'
        ? new Promise((resolve) => {
            finishFirst = resolve
          })
        : Promise.resolve(voices),
    )
    const { onPlay, user } = renderResults({ search: 'brass' })

    await user.click(await catalogResult())
    await user.click(screen.getByRole('button', { name: /^Play BRASS 6 BC from ROM2A/ }))
    await vi.waitFor(() => expect(onPlay).toHaveBeenCalledOnce())
    finishFirst(makeDemoVoices())
    await Promise.resolve()

    expect(onPlay).toHaveBeenCalledExactlyOnceWith(voices[13], undefined)
  })

  it('explains a catalog bank that could not be downloaded', async () => {
    loadDx7CatalogBank.mockRejectedValue(new Dx7CatalogBankUnavailableError('ROM1A'))
    const { user } = renderResults()

    await user.click(await catalogResult())

    expect((await screen.findByRole('alert')).textContent).toBe(
      'That patch bank could not be downloaded. Check your connection, then try again.',
    )
  })

  it('offers a catalog patch for copying with where it comes from', async () => {
    const voices = makeDemoVoices()
    loadDx7CatalogBank.mockResolvedValue(voices)
    const { onCopy, user } = renderResults()

    await user.click(
      await screen.findByRole('button', { name: 'Copy BRASS 1 to a workspace bank' }),
    )

    await vi.waitFor(() =>
      expect(onCopy).toHaveBeenCalledExactlyOnceWith(
        {
          effects: undefined,
          name: 'BRASS   1',
          origin: '01 BRASS   1 · ROM1A Master',
          slot: 1,
          voice: voices[0],
        },
        false,
      ),
    )
  })

  it('asks to copy and edit a result when it is double-clicked', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { onCopy, onPlay, user } = renderResults()

    await user.dblClick(await catalogResult())

    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith(expect.anything(), true))
    expect(onCopy).toHaveBeenCalledOnce()
    // The two clicks of a double-click also play it, as on a slot.
    expect(onPlay).toHaveBeenCalled()
  })

  it('asks to copy and edit the result just played when Enter is pressed on it', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { onCopy, user } = renderResults()
    const result = await catalogResult()
    await user.click(result)
    await vi.waitFor(() => expect(result.getAttribute('aria-current')).toBe('true'))

    await user.keyboard('{Enter}')

    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledExactlyOnceWith(expect.anything(), true))
  })

  it('plays a result that has not been played when Enter is pressed on it', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { onCopy, onPlay, user } = renderResults()
    ;(await catalogResult()).focus()

    await user.keyboard('{Enter}')

    await vi.waitFor(() => expect(onPlay).toHaveBeenCalledOnce())
    expect(onCopy).not.toHaveBeenCalled()
  })

  it('reports saved banks that could not be read', async () => {
    renderResults({ hasDamagedNamedBanks: true })

    expect(screen.getByRole('alert').textContent).toBe(
      'Some saved banks could not be read, so they are hidden. They remain unchanged in browser storage.',
    )
  })

  it('reports saved banks that could not be loaded', async () => {
    renderResults({ namedBanksLoadFailed: true })

    expect(screen.getByRole('alert').textContent).toBe(
      'Saved banks could not be loaded from browser storage.',
    )
  })

  it('says when nothing matches anywhere', async () => {
    renderResults({ search: 'zzzzzz' })

    expect(
      await screen.findByRole('heading', {
        name: 'No patches match this search',
      }),
    ).toBeTruthy()
  })

  it('leaves out a saved patch that sounds exactly like a workspace match, and says so', async () => {
    const bank = savedBank('SOLO LEAD')
    renderResults({
      namedBanks: [bank],
      search: 'solo',
      workspaceEffects: { 'bank-A-1': savedEffects },
      workspaceMatches: [{ id: 'bank-A-1' }],
      workspaceVoices: { 'bank-A-1': bank.slots[0].voice },
    })

    const saved = await screen.findByRole('region', { name: 'Saved banks' })

    expect(within(saved).queryByRole('button', { name: /^Play SOLO LEAD/ })).toBeNull()
    expect(within(saved).getByText('Duplicate patches aren’t shown.')).toBeTruthy()
  })

  it('keeps a saved patch whose FM1 effects differ from the workspace copy', async () => {
    const bank = savedBank('SOLO LEAD')
    renderResults({
      namedBanks: [bank],
      search: 'solo',
      workspaceMatches: [{ id: 'bank-A-1' }],
      workspaceVoices: { 'bank-A-1': bank.slots[0].voice },
    })

    expect(await screen.findByRole('button', { name: 'Play SOLO LEAD from Leads 01' })).toBeTruthy()
  })

  it('lists a catalog patch that several banks repeat once', async () => {
    renderResults({ search: 'pipes   1' })

    const catalog = await screen.findByRole('region', { name: 'Other DX7 patch banks' })

    expect(within(catalog).getAllByRole('button', { name: /^Play PIPES 1/ })).toHaveLength(1)
  })

  it('says it leaves out copies, in German', async () => {
    await setLocale('de')
    renderResults({ search: 'pipes   1' })

    expect(await screen.findByText('Doppelte Sounds werden nicht angezeigt.')).toBeTruthy()
  })

  it('does not say nothing matches while the workspace has matches', async () => {
    renderResults({
      search: 'zzzzzz',
      workspaceMatches: [{ id: 'bank-A-1' }],
    })
    await vi.waitFor(() => expect(screen.queryByRole('status')).toBeNull())

    expect(screen.queryByRole('heading', { name: /No patches match/ })).toBeNull()
  })

  it('shows the first results of a long list and asks for a narrower search, in German', async () => {
    await setLocale('de')
    renderResults({ search: 'a' })

    expect(
      await screen.findByText(
        /^Die ersten 60 von \d+ Treffern werden angezeigt\. Gib mehr ein, um die Suche einzugrenzen\.$/,
      ),
    ).toBeTruthy()
  })

  it('keeps working after a page translator rewrites its text', async () => {
    loadDx7CatalogBank.mockResolvedValue(makeDemoVoices())
    const { container, user } = renderResults()
    const result = await catalogResult()
    translatePageText(container)

    await user.click(result)

    await vi.waitFor(() => expect(result.getAttribute('aria-current')).toBe('true'))
  })
})
