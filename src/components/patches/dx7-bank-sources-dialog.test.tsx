// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Dx7BankSourcesDialog } from '@/components/patches/dx7-bank-sources-dialog'
import { setLocale } from '@/i18n'
import french from '@/i18n/locales/fr'

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

describe('Dx7BankSourcesDialog', () => {
  it('describes each bank source in English and keeps the site names', () => {
    render(<Dx7BankSourcesDialog />)

    expect(screen.getByText('Yamaha Black Boxes')).toBeTruthy()
    expect(screen.getByText('Factory DX7 cartridges and SysEx banks.')).toBeTruthy()
    expect(screen.getByText('Curated DX7, TX816 and TX802 SysEx banks.')).toBeTruthy()
  })

  it('describes each bank source in the interface language', async () => {
    await setLocale('fr')
    render(<Dx7BankSourcesDialog />)

    expect(screen.getByText('Yamaha Black Boxes')).toBeTruthy()
    for (const description of Object.values(french.dialogs.sourceDescriptions)) {
      expect(screen.getByText(description)).toBeTruthy()
    }
  })
})
