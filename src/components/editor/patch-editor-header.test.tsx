// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'

import { PatchEditorHeader } from './patch-editor-header'

afterEach(cleanup)

function renderHeader(
  presets: ComponentProps<typeof PatchEditorHeader>['presets'] = {
    items: [],
    label: 'Voice presets',
    menuRef: createRef<HTMLDetailsElement>(),
  },
) {
  const noop = vi.fn()
  render(
    <PatchEditorHeader
      canSync
      canRedo={false}
      canUndo={false}
      isComparing={false}
      isDirty={false}
      liveName="INIT"
      onBack={noop}
      onCompare={noop}
      onStopCompare={noop}
      onNameBlur={noop}
      onNameChange={noop}
      onRedo={noop}
      onResend={noop}
      onRevert={noop}
      onSave={noop}
      onUndo={noop}
      patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
      presets={presets}
      saveMenuRef={createRef<HTMLDetailsElement>()}
      syncState="live"
    />,
  )
}

describe('PatchEditorHeader', () => {
  it('lists the presets it is given, each with its line, in the order given', async () => {
    const onSelect = vi.fn()
    renderHeader({
      items: [
        { description: 'A plain start.', id: 'init', name: 'Start', onSelect: vi.fn() },
        { description: 'Something else.', id: 'other', name: 'Other', onSelect },
      ],
      label: 'Test presets',
      menuRef: createRef<HTMLDetailsElement>(),
    })
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Test presets'))
    const items = screen.getAllByRole('button').filter((button) => button.closest('details'))
    expect(items.map((button) => button.textContent)).toEqual([
      'StartA plain start.',
      'OtherSomething else.',
    ])
    await user.click(items[1])

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('shows the DX7 block cursor in the patch name field', () => {
    renderHeader()

    expect(screen.getByRole('textbox', { name: 'Patch name' }).classList).toContain('name-caret')
  })
})
