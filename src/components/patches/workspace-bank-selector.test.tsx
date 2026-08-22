// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'

import { WorkspaceBankSelector, type WorkspaceBankSelectorBank } from './workspace-bank-selector'

const banks: WorkspaceBankSelectorBank[] = [
  { description: 'Warm performance sounds', id: 'A', name: 'Studio Favourites' },
  { description: 'Classic electric pianos', id: 'B', name: 'Electric Keys' },
  { id: 'C', name: 'Digital Textures' },
]

afterEach(cleanup)

function SelectorHarness({ initialBanks = banks }: { initialBanks?: WorkspaceBankSelectorBank[] }) {
  const [availableBanks, setAvailableBanks] = useState(initialBanks)
  const [selectedBank, setSelectedBank] = useState(initialBanks[0]?.id ?? '')

  return (
    <>
      <WorkspaceBankSelector
        banks={availableBanks}
        label="Destination browser bank"
        onSelect={setSelectedBank}
        renderActions={(bank) => (
          <button
            onClick={() => {
              const remaining = availableBanks.filter((candidate) => candidate.id !== bank.id)
              const deletedIndex = availableBanks.findIndex((candidate) => candidate.id === bank.id)
              const nextBank = availableBanks[deletedIndex + 1] ?? availableBanks[deletedIndex - 1]
              if (selectedBank === bank.id && nextBank) setSelectedBank(nextBank.id)
              setAvailableBanks(remaining)
            }}
            type="button"
          >
            Delete {bank.name}
          </button>
        )}
        selectedBank={selectedBank}
      />
      <output aria-label="Displayed bank">{selectedBank}</output>
      <button
        onClick={() =>
          setAvailableBanks((current) => [...current, { id: 'D', name: 'New Arrivals' }])
        }
        type="button"
      >
        Add bank
      </button>
    </>
  )
}

describe('WorkspaceBankSelector', () => {
  it('exposes the selector as a named list', () => {
    render(<SelectorHarness />)

    expect(screen.getByRole('list', { name: 'Destination browser bank' })).toBeTruthy()
  })

  it('uses unique full bank names at narrow and wide viewport sizes', () => {
    const { rerender } = render(<SelectorHarness />)

    window.innerWidth = 320
    window.dispatchEvent(new Event('resize'))
    expect(screen.getByRole('button', { name: 'A — Studio Favourites' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'B — Electric Keys' })).toBeTruthy()

    window.innerWidth = 1280
    window.dispatchEvent(new Event('resize'))
    rerender(<SelectorHarness />)
    expect(screen.getByRole('button', { name: 'A — Studio Favourites' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'B — Electric Keys' })).toBeTruthy()
  })

  it('exposes exactly one bank as pressed', () => {
    render(<SelectorHarness />)

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites', pressed: true }),
    ).toBeTruthy()
  })

  it('updates selection and the displayed bank after pointer activation', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)

    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))

    expect(screen.getByRole('button', { name: 'B — Electric Keys', pressed: true })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Displayed bank' }).textContent).toBe('B')
  })

  it('moves focus and selection with ArrowDown and ArrowUp, including wrapping', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)
    const firstBank = screen.getByRole('button', { name: 'A — Studio Favourites' })
    firstBank.focus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'B — Electric Keys', pressed: true })).toBe(
      document.activeElement,
    )

    await user.keyboard('{ArrowUp}')
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: 'C — Digital Textures', pressed: true })).toBe(
      document.activeElement,
    )
  })

  it('moves to the first and last banks with Home and End', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)
    screen.getByRole('button', { name: 'A — Studio Favourites' }).focus()

    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'C — Digital Textures', pressed: true })).toBe(
      document.activeElement,
    )

    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'A — Studio Favourites', pressed: true })).toBe(
      document.activeElement,
    )
  })

  it('gives every action summary the full bank name', () => {
    render(<SelectorHarness />)

    expect(screen.getByLabelText('Actions for Studio Favourites')).toBeTruthy()
    expect(screen.getByLabelText('Actions for Electric Keys')).toBeTruthy()
    expect(screen.getByLabelText('Actions for Digital Textures')).toBeTruthy()
  })

  it('opens an action control without changing bank selection', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)

    await user.click(screen.getByLabelText('Actions for Electric Keys'))

    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites', pressed: true }),
    ).toBeTruthy()
    expect(screen.getByLabelText('Actions for Electric Keys').closest('details')?.open).toBe(true)
  })

  it('opens an action control with Enter without changing bank selection', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)
    const actions = screen.getByLabelText('Actions for Electric Keys')
    actions.focus()

    await user.keyboard('{Enter}')

    expect(actions.closest('details')?.open).toBe(true)
    expect(
      screen.getByRole('button', { name: 'A — Studio Favourites', pressed: true }),
    ).toBeTruthy()
  })

  it('does not nest interactive controls', () => {
    const { container } = render(<SelectorHarness />)
    const interactiveSelector = 'a[href], button, input, select, summary, textarea'
    const prohibitedParentSelector = 'a[href], button, summary'

    expect(
      [...container.querySelectorAll(prohibitedParentSelector)].filter((element) =>
        element.querySelector(interactiveSelector),
      ),
    ).toEqual([])
  })

  it('adds new banks to the named list and keyboard sequence', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)

    await user.click(screen.getByRole('button', { name: 'Add bank' }))
    const list = screen.getByRole('list', { name: 'Destination browser bank' })
    expect(within(list).getByRole('button', { name: 'D — New Arrivals' })).toBeTruthy()

    screen.getByRole('button', { name: 'C — Digital Textures' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'D — New Arrivals', pressed: true })).toBe(
      document.activeElement,
    )
  })

  it('focuses the next surviving bank after deleting the selected bank', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)
    await user.click(screen.getByRole('button', { name: 'B — Electric Keys' }))
    await user.click(screen.getByLabelText('Actions for Electric Keys'))

    await user.click(screen.getByRole('button', { name: 'Delete Electric Keys' }))

    expect(screen.queryByRole('button', { name: 'B — Electric Keys' })).toBeNull()
    expect(screen.getByRole('button', { name: 'C — Digital Textures', pressed: true })).toBe(
      document.activeElement,
    )
  })
})
