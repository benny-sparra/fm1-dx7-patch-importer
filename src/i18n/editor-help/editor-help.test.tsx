// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useTranslation } from 'react-i18next'

import i18n from 'i18next'

import '@/i18n'
import { loadEditorHelpNamespace } from '@/i18n/editor-help'
import { HelpPopover } from '@/components/ui/help-popover'

afterEach(cleanup)

/** Asks for the help text exactly as the editor's own components do. */
function PitchEnvelopeHelp() {
  const { t } = useTranslation()
  return <HelpPopover label="Pitch envelope" text={t('controlHelp.pitchEnvelope')} />
}

describe('the editor help namespace', () => {
  beforeAll(async () => {
    await loadEditorHelpNamespace('en')
  })

  it('reaches a help control through the eager namespace it falls back from', async () => {
    const user = userEvent.setup()
    render(<PitchEnvelopeHelp />)

    await user.hover(screen.getByRole('button', { name: 'Help: Pitch envelope' }))

    expect(screen.getByText(/Changes the pitch over the life of each note/)).toBeTruthy()
  })

  it('translates the help text when the interface language changes', async () => {
    const user = userEvent.setup()
    await loadEditorHelpNamespace('de')
    await i18n.changeLanguage('de')

    try {
      render(<PitchEnvelopeHelp />)
      await user.hover(screen.getByRole('button', { name: /Pitch envelope/ }))

      expect(screen.getByText(/Verändert die Tonhöhe/)).toBeTruthy()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
