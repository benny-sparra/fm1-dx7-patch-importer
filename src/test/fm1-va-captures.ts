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

// Preset 097 after Erase Preset made it a Virtual Analog preset and SAVE stored it, from a backup
// saved on 2026-10-01. Its record's byte 18 is 5A, where an FM preset's is 03.
export const capturedVirtualAnalog = bytes(
  `F0 43 00 7D 04 60 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 63 00 01 00 07 63 63 63 63 63
   63 63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00
   00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63
   63 00 27 00 00 00 00 00 00 00 00 00 01 00 07 63 63 63 63 63 63 63 00 27 00 00 00 00 00 00 00 63
   00 01 00 07 63 63 63 63 32 32 32 32 00 00 01 23 00 00 00 00 00 03 18 56 4F 49 43 45 20 39 37 20
   20 00 50 03 03 03 03 03 03 00 03 03 03 03 03 03 03 00 03 03 03 03 5A 02 32 3C 64 00 64 00 00 00
   00 00 00 00 01 00 00 02 00 00 00 03 00 00 04 00 00 78 05 00 00 00 00 00 00 07 00 00 00 00 00 00
   00 00 00 00 00 07 F7`,
)

// FM-1_093's answer to the preset read for preset 097, copied from the preset probe on 2026-10-02
// after its Filter was switched on and stored with SAVE. Beside the backup above, only record byte
// 28 differs, 00 to 01, and the voice is the same.
export const capturedVirtualAnalogFilterOnReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 04 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 57 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after Filter was moved below Reverb on the FX
// screen and stored with SAVE. Beside the read above, only record bytes 27 and 30 differ, swapped;
// the FM1 still showed Filter On and Reverb Off.
export const capturedVirtualAnalogReorderedReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 00 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 57 00 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after its Filter was switched on on the
// FX screen and stored with SAVE. Beside `capturedOrgan3Reply`, only record byte 28 differs, 00 to 01.
export const capturedOrgan3FilterOnReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 00 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 00 00 00 00 00
   00 7E 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the Filter's Cutoff was turned from
// 6065 Hz to 1686 Hz on the FX screen and stored with SAVE. Beside
// `capturedVirtualAnalogReorderedReply`, only record byte 0 differs, 50 to 36.
export const capturedVirtualAnalogCutoffReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 62 66 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 00 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 71 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the editor's FX probe sent CC 2 (Filter
// Cutoff) with 40 on the FX channel, the FX screen showed 812 Hz, and SAVE stored it. Beside
// `capturedVirtualAnalogCutoffReply`, only record byte 0 differs, 36 to 28: the value sent.
export const capturedVirtualAnalogCutoffControllerReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 65 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 00 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 7F 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 3 (Filter Resonance)
// with 5, the FX screen showed 50, and SAVE stored it. Beside
// `capturedVirtualAnalogCutoffControllerReply`, only record byte 1 differs, 03 to 05.
export const capturedVirtualAnalogResonanceReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 00 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 7D 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 1 (Filter Type) with
// 2, the FX screen showed high pass, and SAVE stored it. Beside
// `capturedVirtualAnalogResonanceReply`, only record byte 29 differs, 00 to 02.
export const capturedVirtualAnalogFilterTypeReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 7B 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 7 (Reverb Mix) with
// 77, the FX screen showed 77, and SAVE stored it. Beside `capturedVirtualAnalogFilterTypeReply`,
// only record byte 4 differs, 03 to 4D.
export const capturedVirtualAnalogReverbMixReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 31 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 23 (Phaser Mix) with
// 66, the FX screen showed 66, and SAVE stored it. Beside `capturedVirtualAnalogReverbMixReply`,
// only record byte 17 differs, 03 to 42.
export const capturedVirtualAnalogPhaserMixReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 30 60 40 01 03 06 0C 18 30 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 72 01 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 10 (Delay Rate) with
// 33, the FX screen showed 33, and SAVE stored it. Beside `capturedVirtualAnalogPhaserMixReply`,
// only record byte 7 differs, 03 to 21.
export const capturedVirtualAnalogDelayRateReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 03 06 0C 18 30 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 54 01 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 14 (Distortion Tone)
// with 44, the FX screen showed 44, and SAVE stored it. Beside
// `capturedVirtualAnalogDelayRateReply`, only record byte 10 differs, 03 to 2C.
export const capturedVirtualAnalogDistortionToneReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 2C 06 0C 18 30 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 2B 01 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 18 (Chorus Depth)
// with 55 and SAVE stored it. Beside `capturedVirtualAnalogDistortionToneReply`, only record byte
// 13 differs, 03 to 37.
export const capturedVirtualAnalogChorusDepthReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 2C 06 0C 38 33 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 77 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 20 (Phaser on or off)
// with 127, the FX screen showed the Phaser On, and SAVE stored it. Beside
// `capturedVirtualAnalogChorusDepthReply`, only record byte 43 differs, 00 to 01: the switch is
// stored as on, not as the 127 sent.
export const capturedVirtualAnalogPhaserOnReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 2C 06 0C 38 33 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 76 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 5 (Reverb Type) with
// 2, the FX screen showed Plate, and SAVE stored it. Beside `capturedVirtualAnalogPhaserOnReply`,
// only record byte 32 differs, 00 to 02.
export const capturedVirtualAnalogReverbTypeReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 2C 06 0C 38 33 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 04 08 00 00 60 00 00 00 08 00 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 74 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after Distortion Type was turned from Soft Clip
// to Hard Clip on the FX screen, which no controller sets, and SAVE stored it. Beside
// `capturedVirtualAnalogReverbTypeReply`, only record byte 38 differs, 00 to 01.
export const capturedVirtualAnalogDistortionTypeReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 03 1A 0D 18 10 64 40 01 2C 06 0C 38 33 60 40 01 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 00 04 08 00 00 60 00 00 01 08 00 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 73 00 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after holding ENV switched its envelope
// on and SAVE stored it. Beside `capturedOrgan3FilterOnReply`, only record byte 53 differs, 00 to
// 40.
export const capturedOrgan3EnvelopeOnReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 00 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 01 00 00 00 00
   00 3E 00 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after its Envelope's Attack was set to
// 25 in the Envelope group and SAVE stored it. Beside `capturedOrgan3EnvelopeOnReply`, only record
// byte 54 differs, 00 to 19.
export const capturedOrgan3AttackReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 00 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 65 00 00 00 00
   00 25 00 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after the Filter section's Filter row
// in EDIT, FM-1_092's filter for FM presets, was turned from Off to On and SAVE stored it. Beside
// `capturedOrgan3AttackReply`, only record byte 26 differs, 03 to 90.
export const capturedOrgan3PresetFilterOnReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 40 04 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 65 00 00 00 00
   00 18 01 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after its own Filter's Cutoff in the
// EDIT Filter section was turned from 20 kHz, the maximum, to 5 kHz and SAVE stored it. Beside
// `capturedOrgan3PresetFilterOnReply`, only record byte 23 differs, 03 to D0.
export const capturedOrgan3PresetFilterCutoffReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 00 68 03 06 40 04 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 65 00 00 00 00
   00 4B 01 F7`,
)

// FM-1_093's answer for preset 001 (ORGAN 3) on 2026-10-03, after its own Filter was turned back
// Off in the EDIT Filter section and SAVE stored it. Beside `capturedOrgan3PresetFilterCutoffReply`,
// only record byte 26 differs, 90 to 80, and the Cutoff in byte 23 is kept.
export const capturedOrgan3PresetFilterOffReply = bytes(
  `F0 7D 20 01 00 00 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 50 02 00 08 00 20 02 20 02 01 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 00 15 20 18 01 32 46 1D 1A 36 6C 58 28 63 00 1C 01 00 00 00
   1C 00 46 01 00 30 4C 56 31 63 46 65 1A 06 40 0A 00 37 00 40 0A 30 4A 01 00 63 20 0D 1B 36 2C 4E
   31 00 4E 00 00 00 00 46 00 61 04 48 19 16 69 18 27 63 34 0D 03 40 25 45 11 00 20 09 58 04 02 40
   31 63 46 0D 13 23 46 0C 19 1F 1C 48 29 51 60 40 0C 18 1E 49 3A 14 48 13 10 33 40 00 01 02 6A 40
   01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 40 01 03 06 0C 18 30 60 00 68 03 06 00 04 10 00 40
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 06 00 00 38 00 00 00 04 00 00 65 00 00 00 00
   00 5B 01 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent thirteen controllers,
// each with a value no other used, and one SAVE stored them: CC 4 = 1, 6 = 11, 8 = 1, 9 = 12,
// 11 = 13, 12 = 1, 13 = 14, 15 = 15, 16 = 1, 17 = 16, 19 = 17, 21 = 18, and 22 = 19. Beside
// `capturedVirtualAnalogDistortionTypeReply`, the eleven bytes the effects layout predicts for all
// but CC 12 and 13 changed to those values, and nothing else did.
export const capturedVirtualAnalogEffectControllersReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 0B 1A 0D 60 10 24 43 01 2C 1E 40 38 13 42 44 09 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 01 04 08 08 00 60 00 00 01 08 04 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 0F 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-03, after the FX probe sent CC 12 (Distortion on or
// off) with 1 and CC 13 (Distortion Gain) with 14, and SAVE stored them. Beside
// `capturedVirtualAnalogEffectControllersReply`, only record bytes 9 (03 to 0E) and 37 (00 to 01)
// differ.
export const capturedVirtualAnalogDistortionReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 0B 1A 0D 60 10 24 03 07 2C 1E 40 38 13 42 44 09 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 01 04 08 08 00 60 40 00 01 08 04 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 03 00 F7`,
)

// FM-1_093's answer for preset 097 on 2026-10-04, after Distortion Type was turned from Hard Clip
// to Foldback on the FX screen and SAVE stored it. Beside `capturedVirtualAnalogDistortionReply`,
// only record byte 38 differs, 01 to 02.
export const capturedVirtualAnalogFoldbackReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 0C 1B 36 6C 58 31 63 46 01 38 02 00 00 00 38 00 0C 13 00 60 58
   31 63 46 0D 1B 36 0C 40 13 00 00 00 40 03 00 00 01 00 46 0D 1B 36 6C 58 31 63 00 1C 01 00 00 00
   1C 00 00 08 00 30 6C 58 31 63 46 0D 1B 06 60 09 00 00 00 60 01 00 40 00 00 63 46 0D 1B 36 6C 58
   31 00 4E 00 00 00 00 0E 00 00 04 00 18 36 6C 58 31 63 46 0D 03 70 04 00 00 00 70 00 18 26 00 40
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 18 18 2C 3D 4A 34 28 11 10 39 6E 00 01 02 25 41
   01 0B 1A 0D 60 10 24 03 07 2C 1E 40 38 13 42 44 09 42 34 09 10 43 0C 00 72 00 01 02 0C 10 40 00
   00 01 04 08 08 00 60 40 00 02 08 04 00 50 20 00 00 00 01 02 04 08 10 20 40 00 00 00 00 00 00 00
   00 02 00 F7`,
)

// FM-1_097's answer for preset 097 on 2026-10-10, copied from the preset probe: NES ROCK from
// Baud Girl's 8-Bit pack, placed by the Device Manager. Its record's byte 18 is C3. Written back
// through the preset probe, it read back byte for byte (docs/hardware-runs/fm1-va-097-tests-2026-10-10.md,
// M4).
export const capturedEightBitReply = bytes(
  `F0 7D 20 01 00 06 00 00 00 3B 01 20 41 51 65 18 00 60 64 30 30 04 40 00 02 23 00 00 50 00 05 0D
   13 24 34 41 62 25 06 44 20 00 16 11 00 02 00 43 06 00 10 49 71 51 0A 00 30 32 6E 18 02 00 00 41
   14 19 64 28 78 45 04 0A 19 5A 00 2C 41 02 46 16 00 04 00 0C 49 01 00 42 11 48 64 28 00 65 43 0C
   14 2D 34 01 60 03 00 00 00 19 10 50 60 24 06 07 23 00 30 49 11 35 09 00 00 00 10 00 10 23 61 58
   31 63 46 0D 13 23 46 0C 19 00 10 0C 01 00 00 00 04 18 1C 15 1A 05 44 54 27 43 16 01 01 02 6A 00
   00 1E 3C 78 70 61 43 07 0F 1E 3C 78 70 61 43 07 0F 1E 06 13 00 10 00 40 7F 7F 7F 17 02 00 00 00
   00 00 00 08 00 00 60 00 00 00 08 00 00 50 00 00 00 7F 7F 7F 7F 7F 7F 7F 7F 00 00 00 00 40 0C 00
   00 6C 01 F7`,
)
