const bytes = (text: string) =>
  Uint8Array.from(
    text
      .trim()
      .split(/\s+/)
      .map((byte) => Number.parseInt(byte, 16)),
  )

// Preset 001 (ORGAN 3) from a backup FM-1_089's Save a backup wrote on 2026-09-29: the header and
// slot, the 155-byte voice, the 68-byte settings record, the checksum, and F7.
export const capturedOrgan3 = bytes(
  `F0 43 00 7D 04 00 63 63 63 63 63 63 63 00 2A 00 20 00 00 00 01 00 48 00 08 00 04 63 63 63 63 63
   63 63 00 27 00 00 00 00 00 01 00 61 00 01 32 0A 63 47 63 63 63 51 63 00 27 00 00 00 00 00 00 00
   63 00 00 00 07 63 5A 63 63 63 59 63 00 2A 00 37 00 00 00 01 00 53 00 03 00 0A 63 50 63 63 63 39
   63 00 27 00 00 00 00 00 01 00 61 00 01 32 03 63 49 63 4E 63 5A 63 00 2C 15 23 00 00 00 02 00 4B
   00 08 00 0A 63 63 63 63 32 32 32 32 1F 06 01 32 15 05 03 01 04 01 18 4F 52 47 41 4E 20 33 20 20
   20 00 50 03 03 03 03 03 03 00 03 03 03 03 03 03 03 00 03 03 03 03 03 03 03 00 03 03 03 03 03 03
   00 00 00 00 01 00 00 02 00 00 00 03 00 00 04 00 00 00 05 00 00 06 00 00 07 00 00 00 08 00 00 00
   00 00 00 00 00 0C F7`,
)

// FM-1_093's answer to the preset read for preset 001 (ORGAN 3), copied from the preset probe on
// 2026-10-02. Its voice and record match the same preset in the backup above byte for byte.
export const capturedOrgan3Reply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 00 00 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 00 00 00 00 00
   00 7F 00 F7`,
)
