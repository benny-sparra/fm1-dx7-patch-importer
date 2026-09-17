// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'

import { PatchEditorHeader } from './patch-editor-header'

afterEach(cleanup)

function renderHeader() {
  const noop = vi.fn()
  render(
    <PatchEditorHeader
      canSync
      canRedo={false}
      canUndo={false}
      isDirty={false}
      liveName="INIT"
      onBack={noop}
      onNameBlur={noop}
      onNameChange={noop}
      onPreset={noop}
      onInitVoice={noop}
      onRandomise={noop}
      onRedo={noop}
      onResend={noop}
      onRevert={noop}
      onSave={noop}
      onUndo={noop}
      patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
      presetsMenuRef={createRef<HTMLDetailsElement>()}
      saveMenuRef={createRef<HTMLDetailsElement>()}
      syncState="live"
    />,
  )
}

describe('PatchEditorHeader', () => {
  it('gives the randomise action its translated accessible name', () => {
    renderHeader()

    expect(screen.getByRole('button', { name: 'Randomise' })).toBeTruthy()
  })

  it('lists init voice first in the voice presets menu', async () => {
    renderHeader()

    await userEvent.setup().click(screen.getByLabelText('Voice presets'))
    const items = screen
      .getAllByRole('button')
      .filter((button) => button.closest('details'))
      .map((button) => button.querySelector('span')?.textContent)

    expect(items.slice(0, 2)).toEqual(['Init voice', 'Soft pad'])
  })
})
