// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { OfficialOpenTrackStatus } from '@/components/midi/official-open-track-status'
import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'

type Midi = ComponentProps<typeof OfficialOpenTrackStatus>['midi']

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

function renderStatus(midi: Midi) {
  return render(
    <ToastProvider>
      <OfficialOpenTrackStatus midi={midi} />
    </ToastProvider>,
  )
}

const sent = (announce: boolean): Midi => ({
  channel: 3,
  trackDelivery: {
    announce,
    delivery: { channel: 3, name: 'E.PIANO 1', track: 3, type: 'sent' },
  },
})

describe('OfficialOpenTrackStatus', () => {
  it('confirms a patch sent to a track, naming the track, in a notification', () => {
    renderStatus(sent(true))

    expect(
      screen.getByText('Sent “E.PIANO 1” to track 3. Save the project on the FM1 to keep it.'),
    ).toBeTruthy()
  })

  it('confirms nothing for a live edit, which sends without announcing', () => {
    renderStatus(sent(false))

    expect(screen.queryByText(/Sent “E.PIANO 1”/)).toBeNull()
  })

  it('says how to reach a track from a channel that reaches none', () => {
    renderStatus({
      channel: 9,
      trackDelivery: { announce: true, delivery: { channel: 9, type: 'no-track' } },
    })

    expect(screen.getByRole('status').textContent).toBe(
      'Note channel 9 reaches no track, so the patch was not sent. Official Open plays tracks 1 to 7 on channels 1 to 7 and track 8 on channel 10: choose one of those as the note channel in MIDI settings.',
    )
  })

  it('says when the FM1 did not answer which engine the track runs', () => {
    renderStatus({
      channel: 4,
      trackDelivery: { announce: true, delivery: { channel: 4, track: 4, type: 'unread' } },
    })

    expect(screen.getByRole('status').textContent).toMatch(
      /^The FM1 did not say which engine track 4/,
    )
  })

  it('leaves the notice out once the note channel is another than the patch went to', () => {
    renderStatus({
      channel: 3,
      trackDelivery: {
        announce: true,
        delivery: { channel: 1, engine: '303', track: 1, type: 'not-dx7' },
      },
    })

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('names the track and its engine in German', async () => {
    await setLocale('de')

    renderStatus({
      channel: 2,
      trackDelivery: {
        announce: true,
        delivery: { channel: 2, engine: '808', track: 2, type: 'not-dx7' },
      },
    })

    expect(screen.getByRole('status').textContent).toBe(
      'Spur 2 spielt 808 und kann keinen Sound aufnehmen, deshalb wurde nichts gesendet. Stelle Spur 2 am FM1 auf DX7, oder wähle den Notenkanal einer Spur, die DX7 spielt.',
    )
  })

  it('names the patch and track it reached in Ukrainian', async () => {
    await setLocale('uk')

    renderStatus(sent(true))

    expect(
      screen.getByText(
        '«E.PIANO 1» надіслано на доріжку 3. Збережіть проєкт на FM1, щоб не втратити його.',
      ),
    ).toBeTruthy()
  })
})
