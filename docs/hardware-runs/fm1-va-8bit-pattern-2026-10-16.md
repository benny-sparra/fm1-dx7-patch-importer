# FM-1+VA 8-Bit Pattern on FM-1_098, 2026-10-16

Question: which part of an 8-Bit preset's Pattern holds the low bits. "Every field of an 8-Bit
preset" in [`docs/fm1-research.md`](../fm1-research.md) gave the bass Pattern as E 78 bits 0–2 and
E 77 bits 0–1 (the lead's E 120 and E 119), 0–17, without saying which part is low. Run on
`FM-1_098` over USB from macOS Chrome, development build, through the preset probe. The editor sent
only the preset read (`7D 10`); every change was made by hand on the FM1 and stored with SAVE.

- Version: `FM-1_098` (the same FM1 and session as
  [`fm1-va-8bit-fields-2026-10-16.md`](fm1-va-8bit-fields-2026-10-16.md))
- Preset under test: 097, NES ROCK, Key E (so Pattern shows). Backup: the pack backup of the earlier
  run, `fm1-presets-2026-10-16.syx` (stays on the tester's machine)
- A packed voice byte is a byte of the 128 the probe shows. Bass Pattern's parts are in packed byte
  64: **E 77** is its bits 0–1 (the operator's AMS) and **E 78** its bits 2–4 (KVS). The lead's are
  in packed byte 98: **E 119** bits 0–1 and **E 120** bits 2–4.

## Results

| Step | Pattern shown              | Packed byte      | E 77 / E 78 (or lead E 119 / E 120) | Notes                                                                                                                       |
| ---- | -------------------------- | ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1    | Bass Gallop, lead Off      | 64 `19`, 98 `00` | bass 1 / 6, lead 0 / 0              | Baseline read. Gallop is 14 (6 + 1 × 8); the other order would give 25, beyond 17                                           |
| 2    | Bass 1                     | 64 `04`          | 0 / 1                               | Only byte 64 moved. Record 30 `00` → `01` at this first SAVE, as in the 2026-10-16 fields run                               |
| 3    | Bass 8, Alberti            | 64 `01`          | 1 / 0                               | Only byte 64 moved                                                                                                          |
| 4    | Bass 17, User              | 64 `06`          | 2 / 1                               | Only byte 64 moved                                                                                                          |
| 5    | Lead 8, Alberti            | 98 `01`          | 1 / 0                               | Only byte 98 moved; the bass stays at 17                                                                                    |
| 6    | Bass Gallop (14), lead Off | 64 `19`, 98 `00` | as baseline                         | Voice identical to the baseline. Record 30 stays `01`, so the record is not identical                                       |
| 7    | Restore                    | 64 `19`, 98 `00` | as baseline                         | 097 reinstalled from the pack backup through the Device Manager: voice and record identical to the baseline, record 30 `00` |

## Result

**The low three bits are in E 78 (E 120 for the lead) and the high two in E 77 (E 119).**
Pattern = E 78 + 8 × E 77. Steps 2–4 fit it for the bass (1, 8, 17) and the baseline (14); if
E 77 held the low bits, Pattern 8 would have set E 77 to 2 (byte `02`), and the baseline would
read 25. The lead was seen at 0 and 8 only, where it matches the bass; its high value 2 was not
run. No byte beyond the Pattern bits changed in any step except record 30 (`00` → `01`) at the
first SAVE, which the earlier run saw too and no 8-Bit field owns.

Names seen: 8 is Alberti, 14 is Gallop, 17 is User. The tester first reported the baseline name
as "Up", then corrected it to Gallop; the names of the other values were not read.

## Unchecked

- The names of Pattern 1–7, 9–13, 15, and 16 were not read.
- The lead's high part: only the lead's 0 and 8 were read.
- Whether Pattern shows and acts only while a Key is set (the table says so) was not tried; Key E
  stayed set throughout.

## Raw captures

Each read of 097, beside this file, as the probe's JSON with the `reply` field left out (the voice
and record are what the tests use). All carry the `fm1-va-8bit-pattern-capture-097-` prefix and
`-2026-10-16.json` suffix: `baseline`, `p2-bass-pattern-1`, `p3-bass-pattern-8`,
`p4-bass-pattern-17`, `p5-lead-pattern-8`, `p6-back-to-baseline`, `restored`.
`src/lib/fm1-va-eight-bit-editor.test.ts` replays them.
