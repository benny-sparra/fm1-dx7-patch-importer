// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { type Patch } from '@/data/patches'
import { setLocale } from '@/i18n'
import { makeDx7VoiceFile } from '@/lib/dx7-voice-file'
import { makeDemoVoices } from '@/lib/patch-library'
import { updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'

import { ReplacePatchDialog } from './replace-patch-dialog'

// Lets a test hold the file read open, to see the dialog while it is working.
const heldRead = vi.hoisted(() => ({ promise: null as Promise<unknown> | null }))

vi.mock('@/lib/dx7-voice-file', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/dx7-voice-file')>()
  return {
    ...original,
    readDx7VoiceFile: (file: Blob) =>
      heldRead.promise
        ? heldRead.promise.then(() => original.readDx7VoiceFile(file))
        : original.readDx7VoiceFile(file),
  }
})

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
  heldRead.promise = null
  await setLocale('en')
})

const patch: Patch = { bank: 'A', family: 'DX7', id: 'bank-A-5', name: 'PIANO 2', number: 5 }
const fileVoice = updateDx7VoiceName(makeDemoVoices()[0], 'FROM FILE')

function syxFile(bytes: Uint8Array<ArrayBuffer>, name = 'voice.syx') {
  return new File([bytes], name, { type: 'application/octet-stream' })
}

function renderDialog() {
  const replaceVoice = vi.fn(() => null)
  const onClose = vi.fn()
  const onReplaced = vi.fn<(voice: Dx7Voice, changed: unknown) => void>()
  render(
    <ReplacePatchDialog
      library={{ replaceVoice }}
      onClose={onClose}
      onReplaced={onReplaced}
      patch={patch}
    />,
  )
  return { onClose, onReplaced, replaceVoice, user: userEvent.setup() }
}

async function chooseAndReplace(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(screen.getByLabelText('Choose a DX7 SysEx file'), file)
  await user.click(screen.getByRole('button', { name: 'Replace patch' }))
}

describe('ReplacePatchDialog', () => {
  it('names the slot it will replace', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Replace A05 “PIANO 2”?' })).toBeTruthy()
  })

  it('waits for a file before offering to replace', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Replace patch' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('replaces the slot with the voice in the chosen file', async () => {
    const { replaceVoice, user } = renderDialog()

    await chooseAndReplace(user, syxFile(makeDx7VoiceFile(fileVoice)))

    expect(replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      5,
      expect.objectContaining({ data: fileVoice.data, name: 'FROM FILE' }),
    )
  })

  it('reports the replacement and closes', async () => {
    const { onClose, onReplaced, user } = renderDialog()

    await chooseAndReplace(user, syxFile(makeDx7VoiceFile(fileVoice)))

    expect(onReplaced).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'FROM FILE' }),
      null,
    )
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('explains a file of the wrong size', async () => {
    const { user } = renderDialog()

    await chooseAndReplace(user, syxFile(new Uint8Array(200)))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file isn’t a DX7 patch. Choose a .syx file that holds a single patch.',
    )
  })

  it('points a 32-voice bank to the bank’s own import', async () => {
    const { replaceVoice, user } = renderDialog()

    await chooseAndReplace(user, syxFile(new Uint8Array(4104), 'bank.syx'))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file is a 32-voice DX7 bank. To load it, choose “Import DX7 bank” from the bank’s menu.',
    )
    expect(replaceVoice).not.toHaveBeenCalled()
  })

  it('explains a file of the wrong size in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog()

    await user.upload(
      screen.getByLabelText('DX7-SysEx-Datei auswählen'),
      syxFile(new Uint8Array(20)),
    )
    await user.click(screen.getByRole('button', { name: 'Sound ersetzen' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'Diese Datei ist kein DX7-Sound. Wähle eine .syx-Datei, die genau einen Sound enthält.',
    )
  })

  it('explains a file that is not a single-voice dump', async () => {
    const bytes = makeDx7VoiceFile(fileVoice)
    bytes[1] = 0x42
    const { user } = renderDialog()

    await chooseAndReplace(user, syxFile(bytes))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file isn’t a DX7 patch. Choose a .syx file that holds a single patch.',
    )
  })

  it('explains a file whose checksum does not match', async () => {
    const bytes = makeDx7VoiceFile(fileVoice)
    bytes[10] = (bytes[10] + 1) & 0x7f
    const { user } = renderDialog()

    await chooseAndReplace(user, syxFile(bytes))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file looks damaged. Try downloading it again.',
    )
  })

  it('leaves the slot alone when the file is rejected', async () => {
    const { onClose, replaceVoice, user } = renderDialog()

    await chooseAndReplace(user, syxFile(new Uint8Array(20)))

    expect(replaceVoice).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stays open on Escape while the file is being read', async () => {
    heldRead.promise = new Promise(() => {})
    const { onClose, user } = renderDialog()

    await chooseAndReplace(user, syxFile(makeDx7VoiceFile(fileVoice)))
    const cancel = new Event('cancel', { cancelable: true })
    screen.getByRole('dialog').dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })
})
