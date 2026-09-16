// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
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

  it('gives the init voice action its translated accessible name', () => {
    renderHeader()

    expect(screen.getByRole('button', { name: 'Init voice' })).toBeTruthy()
  })
})
