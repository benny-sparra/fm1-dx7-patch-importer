import { unpackDx7Voice, updateDx7VoiceName } from '@/lib/dx7'
import { fm1VaChecksum, fm1VaPresetFileSize } from '@/lib/fm1-va-preset-file'

const messageSize = 231

/** The name the test backup gives the patch in a preset: bank letter, then slot, as A01 or D32. */
export function fm1VaTestPatchName(slot: number) {
  const bank = String.fromCharCode(65 + Math.floor(slot / 32))
  return `${bank}${String((slot % 32) + 1).padStart(2, '0')} PATCH`
}

/**
 * Builds a file laid out as FM-1+VA's "Save a backup" writes one (docs/fm1-research.md), with a
 * blank voice named by `fm1VaTestPatchName` in each preset and an empty settings record. The
 * presets in `damagedSlots` get a checksum that does not match.
 */
export function makeFm1VaBackupBytes(damagedSlots: readonly number[] = []) {
  const file = new Uint8Array(fm1VaPresetFileSize)
  for (let slot = 0; slot < 128; slot += 1) {
    const voice = updateDx7VoiceName(
      { data: new Uint8Array(128), name: '' },
      fm1VaTestPatchName(slot),
    )
    const payload = Uint8Array.from([...unpackDx7Voice(voice), ...new Uint8Array(68)])
    const checksum = fm1VaChecksum(payload) ^ (damagedSlots.includes(slot) ? 0x01 : 0x00)
    file.set([0xf0, 0x43, 0x00, 0x7d, 0x04, slot, ...payload, checksum, 0xf7], slot * messageSize)
  }
  return file
}

export function makeFm1VaBackupFile(name = 'FM-1 presets.syx', damagedSlots?: readonly number[]) {
  return new File([makeFm1VaBackupBytes(damagedSlots)], name, {
    type: 'application/octet-stream',
  })
}
