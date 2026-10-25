// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { NoteChannelSelect } from '@/components/midi/note-channel-select'

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('NoteChannelSelect', () => {
  it('is named Note channel and shows the current channel', () => {
    render(<NoteChannelSelect midi={{ channel: 3, setChannel: vi.fn() }} />)

    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Note channel' })
    expect(select.value).toBe('3')
    expect(select.title).toBe('Note channel')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toHaveLength(16)
    expect(screen.getByRole('option', { name: 'Ch 3' })).toBeTruthy()
  })

  it('sets the channel the user picks as a number', async () => {
    const setChannel = vi.fn()
    render(<NoteChannelSelect midi={{ channel: 1, setChannel }} />)

    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'Ch 10')

    expect(setChannel).toHaveBeenCalledExactlyOnceWith(10)
  })

  it('reads the channel from the same state as another picker', async () => {
    function Both() {
      const [channel, setChannel] = useState(1)
      return (
        <>
          <NoteChannelSelect midi={{ channel, setChannel }} />
          <NoteChannelSelect midi={{ channel, setChannel }} />
        </>
      )
    }
    render(<Both />)

    await userEvent.setup().selectOptions(screen.getAllByRole('combobox')[0], 'Ch 7')

    expect(screen.getAllByRole<HTMLSelectElement>('combobox').map((s) => s.value)).toEqual([
      '7',
      '7',
    ])
  })

  it('writes the short label in the interface language', async () => {
    await setLocale('de')
    render(<NoteChannelSelect midi={{ channel: 5, setChannel: vi.fn() }} />)

    expect(screen.getByRole('combobox', { name: 'Notenkanal' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Kan. 5' })).toBeTruthy()
  })
})
