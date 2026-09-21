// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import french from '@/i18n/locales/fr'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function renderCatalogGroups() {
  render(
    <ToastProvider>
      <AddWorkspaceBankDialog
        bank="E"
        onClose={() => {}}
        library={{} as PatchLibrary}
        onCreated={() => {}}
        suggestedName="Bank 5"
      />
    </ToastProvider>,
  )
  return Array.from(document.querySelectorAll('optgroup'), (group) => group.label)
}

describe('AddWorkspaceBankDialog catalog groups', () => {
  it('names the factory groups in English and keeps the product names', () => {
    expect(renderCatalogGroups()).toEqual([
      'Factory',
      'FM-1 factory presets',
      'VRC Voice ROMs',
      'Grey Matter E!',
    ])
  })

  it('names the factory groups in the interface language', async () => {
    await setLocale('fr')

    expect(renderCatalogGroups()).toEqual([
      french.banks.catalogFactory,
      french.banks.catalogFm1Factory,
      'VRC Voice ROMs',
      'Grey Matter E!',
    ])
  })
})
