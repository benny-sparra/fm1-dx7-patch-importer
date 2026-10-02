import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type Dx7Voice, parseDx7Bank, updateDx7VoiceName } from '@/lib/dx7'
import { emptyPatchLibrary, importVoices, makePatches } from '@/lib/patch-library'

/**
 * A Yamaha factory cartridge from the bundled banks. Its 32 voices all differ, unlike the demo
 * bank's, which share their settings and differ only by name.
 */
export function readFactoryBank(name: 'rom1a' | 'rom1b'): Dx7Voice[] {
  return parseDx7Bank(
    Uint8Array.from(readFileSync(resolve(`public/dx7-banks/factory/${name}.syx`))).buffer,
  )
}

/**
 * A workspace of ROM1A in bank A and ROM1B in bank B, with copies of ROM1A's first voice (BRASS 1)
 * placed over the slots of bank B given, so it holds duplicates to find.
 */
export function makeWorkspaceWithCopies(copies: { name: string; slot: number }[]) {
  const rom1a = readFactoryBank('rom1a')
  const rom1b = readFactoryBank('rom1b')
  for (const { name, slot } of copies) rom1b[slot - 1] = updateDx7VoiceName(rom1a[0], name)
  const snapshot = importVoices(importVoices(emptyPatchLibrary(), 'A', rom1a), 'B', rom1b)
  return { ...snapshot, patches: makePatches(snapshot) }
}
