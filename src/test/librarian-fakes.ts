import type { ComponentProps } from 'react'
import { vi } from 'vitest'

import type { LibrarianPage } from '@/routes/librarian-page'

type Library = ComponentProps<typeof LibrarianPage>['library']
type Midi = ComponentProps<typeof LibrarianPage>['midi']

/**
 * A stand-in for the patch library the librarian page reads: an empty workspace whose actions are
 * mocks. A test overrides what it relies on. When the page starts reading another member, it has
 * to be added here, so no test is handed `undefined` for it.
 */
export function makeLibrarianLibrary(overrides: Partial<Library> = {}): Library {
  return {
    addBank: vi.fn<Library['addBank']>(),
    bankDescriptions: {},
    bankNames: {},
    canRedo: false,
    canUndo: false,
    copyNamedBank: vi.fn<Library['copyNamedBank']>(),
    copyVoice: vi.fn<Library['copyVoice']>(),
    deleteBank: vi.fn<Library['deleteBank']>(),
    deleteNamedBank: vi.fn<Library['deleteNamedBank']>(),
    effects: {},
    getBankVoices: vi.fn<Library['getBankVoices']>(() => []),
    hasDamagedNamedBanks: false,
    importBank: vi.fn<Library['importBank']>(),
    loadDemoBank: vi.fn<Library['loadDemoBank']>(),
    loadSavedBank: vi.fn<Library['loadSavedBank']>(),
    loadedBanks: [],
    moveVoice: vi.fn<Library['moveVoice']>(),
    namedBanks: [],
    namedBanksLoadFailed: false,
    namedBanksLoading: false,
    patches: [],
    redo: vi.fn<Library['redo']>(),
    replaceVoice: vi.fn<Library['replaceVoice']>(),
    resetFactoryBanks: vi.fn<Library['resetFactoryBanks']>(),
    restoreBackup: vi.fn<Library['restoreBackup']>(),
    saveNamedBank: vi.fn<Library['saveNamedBank']>(),
    undo: vi.fn<Library['undo']>(),
    undoChange: vi.fn<Library['undoChange']>(),
    updateBankInformation: vi.fn<Library['updateBankInformation']>(),
    updateNamedBankDetails: vi.fn<Library['updateNamedBankDetails']>(),
    voices: {},
    workspaceBanks: [],
    ...overrides,
  }
}

/** A stand-in for the MIDI controller the librarian page reads, switched off until overridden. */
export function makeLibrarianMidi(overrides: Partial<Midi> = {}): Midi {
  return {
    channel: 1,
    connectMidi: vi.fn<Midi['connectMidi']>(),
    disconnectMidi: vi.fn<Midi['disconnectMidi']>(),
    hasMidiOutput: false,
    isConnecting: false,
    midiAccess: false,
    sendBank: vi.fn<Midi['sendBank']>(),
    sysexAvailable: false,
    ...overrides,
  }
}
