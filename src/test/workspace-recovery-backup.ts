// Portable backup bytes shared by browser journeys and a capture-parity test. No app imports:
// Playwright reads the public file format rather than calling its encoder.
// VA retains LFO Speed 127; the settings records include bytes above 0x7f.
export const recoveryBytes = {
  dx7: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiYwABAgMEBQYHCAkKCwwNDg8QEUJBQ0tVUCAxICA=',
  effects: 'AQIAAAEAAAAAAAAAAAAAAAAAAAAAAAAA',
  record: 'KAUDA00DAyEDAywDAzcDAwNCWgIyZADkgICAAQECAAACAgAAAwABBAAABQEAgICAgICAgAAAAAAAAAA=',
  virtualAnalog:
    'Y2NjY2NjYwAnAAAAOABjAgBjY2NjY2NjACcAAAA4AAACAGNjY2NjY2MAJwAAADgAAAIAY2NjY2NjYwAnAAAAOAAAAgBjY2NjY2NjACcAAAA4AAACAGNjY2NjY2MAJwAAADgAYwIAY2NjYzIyMjIACH8AAAAwGFZPSUNFIDk3ICA=',
  virtualAnalogRecord:
    'UAMDAwMDAwMDAwMDAwMDAwMDWgIyZADkgICAAAEAAQAAAgAAAwAABAAABQAAgICAgICAgAAAAAAAAAA=',
  eightBit:
    'KBgtYwBgMgxGAAIEIwAACig0JiRaUFwyEEEASwQgAAwNAEgyHlUAYDI3RgAABCkZMgpfJCgyWgArKDBaAAQAIxkACCNIMgpQHjIoLVoAPAAAABkIFEwyHEYAWDJSSwAAAAgAMgpjY2NjYzIyMjIACCMAAAAIGE5FUyBST0NLICA=',
  eightBitRecord:
    'UAMAHh4eHh4eHh4eHh4eHh4ewwQAAQD///9FAAAAAAAAAgAAAwAABAAABQAA/////////wAAAABkAAA=',
}

/** One of each engine in the workspace and saved bank, plus a favourite and two FX presets. */
export function completeRecoveryBackup() {
  const dx7 = {
    effects: recoveryBytes.effects,
    record: recoveryBytes.record,
    slot: 1,
    voice: recoveryBytes.dx7,
  }
  const virtualAnalog = {
    effects: recoveryBytes.effects,
    record: recoveryBytes.virtualAnalogRecord,
    slot: 2,
    virtualAnalog: recoveryBytes.virtualAnalog,
  }
  const eightBit = {
    effects: recoveryBytes.effects,
    eightBit: recoveryBytes.eightBit,
    record: recoveryBytes.eightBitRecord,
    slot: 3,
  }
  return {
    format: 'fm1-librarian-backup',
    savedAt: '2026-11-01T10:00:00.000Z',
    savedBanks: [
      {
        createdAt: '2026-10-30T10:00:00.000Z',
        description: 'All three engines, kept byte for byte',
        id: 'recovery-bank',
        name: 'Live pads',
        slots: Array.from({ length: 32 }, (_, index) =>
          index === 1 ? virtualAnalog : index === 2 ? eightBit : { ...dx7, slot: index + 1 },
        ),
        updatedAt: '2026-10-31T10:00:00.000Z',
      },
    ],
    version: 7,
    workspace: {
      bankDescriptions: { A: 'Mixed-engine recovery set' },
      bankNames: { A: 'Recovery' },
      favourites: [
        {
          effects: recoveryBytes.effects,
          id: 'recovery-favourite',
          origin: { bankName: 'Live pads' },
          record: recoveryBytes.record,
          voice: recoveryBytes.dx7,
        },
      ],
      loadedBanks: ['A'],
      slots: [dx7, virtualAnalog, eightBit].map((slot) => ({ bank: 'A', ...slot })),
      workspaceBanks: ['A', 'B'],
    },
    fxPresets: [
      {
        createdAt: '2026-10-30T10:00:00.000Z',
        effects: recoveryBytes.effects,
        id: 'recovery-fx-1-room',
        name: 'Live room',
        updatedAt: '2026-10-31T10:00:00.000Z',
      },
      {
        createdAt: '2026-10-30T10:00:00.000Z',
        effects: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        id: 'recovery-fx-2-hall',
        name: 'Bright hall',
        updatedAt: '2026-10-31T10:00:00.000Z',
      },
    ],
  }
}
