// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { UnsavedEditorDialog } from '@/components/editor/unsaved-editor-dialog'

afterEach(cleanup)

function pressEscape(isResolving: boolean) {
  const dialogRef = createRef<HTMLDialogElement>()
  render(
    <UnsavedEditorDialog
      dialogRef={dialogRef}
      isResolving={isResolving}
      onClose={vi.fn()}
      onDiscard={vi.fn()}
      onSave={vi.fn()}
    />,
  )
  // The browser fires a cancelable cancel event on Escape and closes the dialog unless prevented.
  const cancel = new Event('cancel', { cancelable: true })
  dialogRef.current?.dispatchEvent(cancel)
  return cancel
}

describe('UnsavedEditorDialog', () => {
  it('stays open on Escape while a discard is in progress', () => {
    expect(pressEscape(true).defaultPrevented).toBe(true)
  })

  it('closes on Escape when nothing is in progress', () => {
    expect(pressEscape(false).defaultPrevented).toBe(false)
  })
})
