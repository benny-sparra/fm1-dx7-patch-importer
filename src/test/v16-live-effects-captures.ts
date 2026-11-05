import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/*
 * CAPTURED replies to the read of V16's live FX settings, from the orange FM1 on stock `FM-1_016`
 * on 2026-11-05 (`docs/hardware-runs/stock-v16-live-fx-read-2026-11-05.md`). Each was read once
 * after the editor sent one of the three racks in the run's presets file whole, so the reading
 * should decode to exactly that rack.
 */
export const capturedReplies = {
  /** Every value a number no other control has; Reverb, Distortion, and Phaser on; Space 2. */
  'Read run A distinct':
    'F0 00 32 0D 71 03 00 40 02 1C 01 00 00 60 06 00 00 35 0A 00 58 40 41 47 06 0E 1E 40 08 21 62 04 0A 15 2C 5C 40 61 43 07 0F 1E 3C 78 70 61 43 07 00 01 02 04 08 20 40 00 00 00 06 04 00 40 00 00 00 05 02 00 30 00 00 40 03 00 00 20 00 00 40 28 F7',
  /** Every value 100; Delay and Chorus on; Space 1. */
  'Read run B maximum':
    'F0 00 32 0D 71 03 00 40 02 1C 01 00 00 60 06 00 00 35 0A 00 20 46 4C 07 32 64 48 11 23 46 0C 19 32 64 48 11 23 66 43 07 0F 1E 3C 78 70 61 43 07 00 01 02 04 00 10 40 40 00 00 06 00 00 40 20 00 00 05 00 00 30 00 00 40 03 00 00 20 00 00 20 08 F7',
  /** Every value 0; only the Filter on; Space 0. */
  'Read run C zero':
    'F0 00 32 0D 71 03 00 40 02 1C 01 00 00 60 06 00 00 35 0A 00 00 00 40 07 00 00 00 00 00 00 00 00 00 00 00 00 00 60 43 07 0F 1E 3C 78 70 61 43 07 00 01 02 04 00 00 40 00 00 00 06 00 00 40 00 00 00 05 00 00 30 00 00 40 03 00 00 20 00 00 00 27 F7',
} as const

export function capturedReply(name: keyof typeof capturedReplies) {
  return Uint8Array.from(capturedReplies[name].split(' '), (pair) => Number.parseInt(pair, 16))
}

/** The 24 effect controls of each rack the run sent, from its presets file. */
export function sentRack(name: keyof typeof capturedReplies) {
  const file = JSON.parse(
    readFileSync(
      resolve('docs/hardware-runs/stock-v16-live-fx-read-2026-11-05-presets.json'),
      'utf8',
    ),
  ) as { presets: { effects: number[]; name: string }[] }
  const preset = file.presets.find((candidate) => candidate.name === name)
  if (!preset) throw new Error(`No preset named ${name}`)
  return preset.effects
}
