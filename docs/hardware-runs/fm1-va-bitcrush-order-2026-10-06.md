# FM-1+VA Bitcrush and effect order run

- Date: 2026-10-06
- Firmware: FM-1_096
- Plan: [`docs/fm1-va-096-tests.md`](../fm1-va-096-tests.md) §3, B1–B7, with B8 added
- Tool: the development preset probe's byte map in Chrome, over USB. Each change was made by hand
  on the FM1, stored with SAVE, and read back with `7D 10`.
- Test preset: 032, erased to FM and saved first, so every effect was Off and Bitcrush sat after
  Distortion, its settings never edited (record byte 5 `03`).

| Test | Change on the FM1, then SAVE                     | Record bytes that changed                                                                                            |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| B1   | Bitcrush switched On                             | 5: `03` → `8C`; 35: `00` → `08`; 41: `00` → `48` (72); 44: `00` → `64` (100)                                         |
| B2   | Bitcrush Bits 8 → 4                              | 35: `08` → `04`                                                                                                      |
| B3a  | Bitcrush Sample Rate down to 300 Hz              | 41: `48` → `00`                                                                                                      |
| B3b  | Bitcrush Sample Rate up to 44.1k                 | 41: `00` → `64` (100)                                                                                                |
| B3c  | Bitcrush Sample Rate to 11.5k                    | 41: `64` → `49` (73)                                                                                                 |
| B4   | Bitcrush Mix 100 → 50                            | 44: `64` → `32` (50)                                                                                                 |
| B5   | Bitcrush moved to the top of the Effects list    | 5: `8C` → `88`                                                                                                       |
| B6   | Reverb moved above Filter, Bitcrush still on top | 27: `00` → `01`; 30: `01` → `00`                                                                                     |
| B7   | Reverb switched On                               | 31: `00` → `01`                                                                                                      |
| B8   | Phaser moved to the very top, above Bitcrush     | 5: `88` → `89`; 27: `01` → `05`; 30: `00` → `01`; 33: `02` → `00`; 36: `03` → `02`; 39: `04` → `03`; 42: `05` → `04` |

B5 also changed packed voice bytes 14, 31, 48, and 82 from `00` to `01`: the Output Levels of
operators 6, 5, 4, and 2, the modulators of the erased preset's algorithm 1. That is what KNOB1
plays on the Preset knob bank (Brightness), so a knob was probably nudged during B5; moving an
effect is not taken to touch the voice.

## Findings

- **Byte 5 is Bitcrush's own byte:** `80` marks it set, `08` its switch, and bits 0–2 its place
  among the seven rows of the Effects list, top first. An erased preset holds `03` there, which
  lacks the marker, and plays Bitcrush Off after Distortion.
- **Bitcrush's settings** are Bits in byte 35 (1–16), Sample Rate in byte 41 (0–100, 0 = 300 Hz,
  100 = 44.1 kHz, and 73 = the 11.5k shown, as 300 × (44118 / 300)^(v / 100) gives), and Mix in
  byte 44 (0–100). The first edit writes all three, at their defaults 8, 72, and 100, as it sets
  the marker.
- **The six chain bytes, 27 + 3k, list the other six effects** top to bottom, leaving Bitcrush
  out; moving Bitcrush changes only byte 5, and moving another effect changes only the chain.
  Before B8 the chain read Reverb, Filter, Delay, Distortion, Chorus, Phaser; after it, Phaser
  first. The effect numbers are 0 Filter, 1 Reverb, 2 Delay, 3 Distortion, 4 Chorus, 5 Phaser.
- **Switches follow the effect, not its place:** Reverb's switch is byte 31 (28 + 3 × 1) after
  Reverb moved to the top.
