# FM-1_096 hardware tests

**Prepared:** 2026-10-06, from the FM-1+VA manual and Device Manager at release `FM-1_096`
**Execution status:** §6 run on `FM-1_096`, 2026-10-06, apart from T2 at 500 ms; ledger
[`docs/hardware-runs/fm1-va-write-timing-2026-10-06.md`](hardware-runs/fm1-va-write-timing-2026-10-06.md).
§3 run the same day, with B8 (Phaser moved to the top) added; ledger
[`docs/hardware-runs/fm1-va-bitcrush-order-2026-10-06.md`](hardware-runs/fm1-va-bitcrush-order-2026-10-06.md).
§1, §2, §4, §5, and §7 not run yet.
**Scope:** whether the facts `docs/fm1-research.md` records under "FM-1_096", all **Likely** and
read from Baud Girl's web code and preset packs, hold on an FM1; whether the editor's handling of
8-Bit presets (#191) keeps them safe; and where the settings FM-1_096 added live in the record. The
answers decide what backlog items FM-1+VA 5, 6, and 9 can rely on (`docs/feature-backlog.md`).

The editor sends only what production code already sends to FM-1+VA (the identity query, Program
Change, DX7 parameter changes, effect CCs, and the preset read `7D 10`), plus preset writes `7D 04`:
in §5 through **Write patches to the FM1…**, which asks before writing, and in §2 and §6 from the
preset probe, which writes presets back exactly as read. Every other change
is made by hand on the FM1 and stored with SAVE. Nothing touches the updater, the loader, or a
pattern. §7 puts every preset back from the backup.

## 0. Preparation

1. Install `FM-1_096` from FM-1+VA's **Install** page in Chrome or Edge. Check **About** at the end
   of the GLOBE screen and record the version and build date in the ledger (§8).
2. Open FM-1+VA's **Device Manager**, connect the FM1, and press **Back up everything**. Keep both
   files (`fm1-presets-<date>.syx` and `fm1-patterns-<date>.syx`): they are the only way back.
3. In the Device Manager's **Library**, choose **8-Bit pack**, **Place all 16**, and send, leaving
   the backup ticked. The 8-Bit pack goes to presets 097–112. Install the **VA pack** the same way
   if presets 113–128 do not already hold it. Press **Back up everything** again and keep this
   second presets file as the **pack backup**. Close the Device Manager tab, so it does not hold
   the FM1's MIDI port.
4. Pick the **FM test preset**: a preset in bank A–C you can lose, such as 032. Record its name.
5. Start the development build with `npm run dev` and open it in Chrome. Switch MIDI on, choose
   the FM1 as output and input, and allow SysEx. Open the **FM-1+VA preset probe (dev)** from the
   footer for §3 and §4.
6. Keep GLOBE at its defaults: **MIDI Channel** All, **FX Channel** 2.

Mapping a setting in §3 and §4 always runs the same way: read the preset in the probe, change
exactly one setting on the FM1, type it under **Changed by hand on the FM1** (such as
`Bitcrush On`), press **Note the change**, press SAVE on the FM1, and read the same preset again.
The probe logs the bytes that changed against the setting. At the end of each section press
**Copy map** and paste the JSON into the ledger.

## 1. The editor on FM-1_096 (F1–F5)

**F1. Identification.** With the ports chosen, record what the header badge and the firmware
setting show. Expected: **BAUD GIRL FM-1_096**, and the **Baud Girl (FM-1+VA)** menu items offered.

**F2. Read presets from the FM1.** Choose **Read presets from the FM1…**. Record whether all 128
reads finish, and what bank D's panel shows. Expected: 097–112 marked **8-Bit** with their pack
names (NES ROCK first), 113–128 marked **VA**, and the line "16 presets are 8-Bit, which the library
can't hold yet. Their slots keep their patches." Switch bank D off and close the dialog without
importing.

**F3. The presets file.** Choose **Import Baud Girl presets file…** and select the pack backup
from §0.3. Expected: the file is accepted, and bank D shows exactly what F2 showed. Close without
importing.

**F4. A write over bank D.** Make sure one library bank holds 32 DX7 patches, none matching the
FM1's bank D. Choose **Write patches to the FM1…**, switch on **Write to FM1 bank D**, and choose
that bank under **Write from**. Record the summary line. Expected: "Every patch matches. Virtual
Analogue presets are kept. 8-Bit presets are kept.", since every preset in FM1 bank D is one or the
other. If the dialog offers a write for bank D, open it, record which presets the confirmation
lists, and **Cancel**: no preset 097–128 may appear.

**F5. An audition over an 8-Bit preset.** Select bank D in the library and click its slot 1. The
editor sends Program Change 96, then the library's voice as 155 parameter changes. Record what the
FM1 shows (engine, name, unsaved-changes dot) and what plays. Then step PRESETS away and back
without SAVE, and record whether NES ROCK returns as an 8-Bit preset. Expected: an unsaved FM edit
that the preset change discards, as test V7 found for a Virtual Analog preset on `FM-1_093`.

## 2. Messages and the engine marker (M1–M4)

**M1. Read sizes.** In the probe, read 097, 113, and the FM test preset. Record whether each read
succeeds; the probe shows a 59-byte record and a 128-byte voice. Press **Copy capture** for 097 and
keep the JSON as a fixture candidate. Expected: all three read, with byte 18 `C3`, `5A`, and the FM
preset's own value.

**M2. The read matches the file.** Compare 097's record and voice in the probe with the pack
backup imported in F3 (or with the capture). Expected: identical.

**M3. Erasing to each engine.** On the FM test preset, choose **Erase Preset**, then **FM**, press
SAVE, and read it in the probe. Record byte 18 and every byte that differs from the factory preset
it replaced. Repeat with **8-Bit**, then **VA**. Expected: `C3` for 8-Bit and `5A` for VA. FM-1+VA's
web code expects `A5` for FM; the editor reads any value but `5A` and `C3` as FM, so record it
either way.

**M4. Write and read back an 8-Bit preset.** In the probe, read 097 and use its write-back test
(unchanged, not renamed), which writes the preset to its own slot and reads it again. Record whether
it matches, and whether NES ROCK still plays as before. Expected: a match. This checks that the
preset write stores 8-Bit voice bytes exactly, which keeping 8-Bit presets in the library
(backlog item 9) depends on.

## 3. Bitcrush and effect order (B1–B7)

Run these on the FM test preset, starting from the FM erase of M3 (every effect Off, Bitcrush
straight after Distortion, its settings never edited).

| Test | Change on the FM1, then SAVE                                                        | Expected bytes                                                                                        |
| ---- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| B1   | FX, Bitcrush switched On                                                            | 5: `80` \| On `08` \| place 4 = `8C`; 35 = 8, 41 = 72, 44 = 100 (the defaults, written on first edit) |
| B2   | Bitcrush Bits 8 → 4                                                                 | 35: 8 → 4                                                                                             |
| B3   | Bitcrush Sample Rate to 300 Hz, then 44.1k, then two values between (one read each) | 41 from 0 to 100; record each value shown with the byte, to check Hz = 300 × (44118 / 300)^(v / 100)  |
| B4   | Bitcrush Mix 100 → 50                                                               | 44: 100 → 50                                                                                          |
| B5   | Bitcrush moved to the top of the Effects list                                       | 5: place bits 0–2 to 0. Record the chain bytes 27, 30, 33, 36, 39, and 42 too                         |
| B6   | Reverb moved above Filter, Bitcrush still on top                                    | Chain bytes 27 and 30 swap. Record whether byte 5 changes                                             |
| B7   | Reverb switched On after B6                                                         | 31 (28 + 3 × Reverb) changes, not the byte of Reverb's new place                                      |

B5 and B6 settle how seven effects share six chain bytes and byte 5. B7 confirms that switches
follow the effect rather than its place, as the editor already assumes.

After B6, also send CC 4 (Reverb on or off) with 0 and then 127 from the **FX probe (dev)** on the
FX Channel, and record whether the Reverb row follows. Expected: it does, since the controllers are
fixed to the effect, not its place.

## 4. Knob choices, levels, envelope, and Mono (K1–K3, L1–L4, E1–E2)

Run each on the engine named.

| Test | Preset                   | Change on the FM1, then SAVE                                            | Expected bytes                                                                                                                           |
| ---- | ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| K1   | FM test                  | EDIT, Knobs, Knob 1 to its fourth choice                                | 53: bits 0–2 to 3, bit 7 set; bit 6 (Envelope) unchanged                                                                                 |
| K2   | FM test                  | Knob 3 to its sixth choice                                              | 52: bits 0–2 to 5, bit 7 set                                                                                                             |
| K3   | 113 (VA) and 097 (8-Bit) | Knob 2 to its fifth choice on each                                      | 53: bits 3–5 to 4, bit 7 set, on both engines                                                                                            |
| L1   | FM test                  | Mixer knob bank, KNOB1 (Preset Level) 99 → 50, then → 0 (one read each) | Not known; byte 2 is the guess. Record every byte that moves                                                                             |
| L2   | 113 (VA)                 | Preset Level 99 → 50                                                    | As L1: record every byte                                                                                                                 |
| L3   | 113 (VA)                 | EDIT, Level 78 → 40                                                     | Packed voice byte 14, operator 6's Output Level                                                                                          |
| L4   | 097 (8-Bit)              | Mixer bank, Drums, Bass, and Lead Level each 99 → 50, one per read      | Drums: record byte 2 = `80` \| (99 − 50). Bass and Lead: packed voice bytes, which Baud Girl's code puts at edit-buffer bytes 61 and 124 |
| E1   | FM test                  | Envelope On, then Decay, Sustain, Release each to 25, one per read      | 53 bit 6 set; 55, 56, 57 to 25 (Attack, 54, is already confirmed)                                                                        |
| E2   | 113 (VA)                 | Mono On                                                                 | 58: 0 → 1                                                                                                                                |

If L1 shows that Preset Level and the 8-Bit Drums Level share byte 2, record how an FM preset
stores it (the same `80` | (99 − level) form or another), because `fm1VaRecordWithEffects` keeps
byte 2 as read and the library would carry the level through every write.

## 5. A write next to the 8-Bit presets (W1)

**W1.** Read the presets again and import FM1 bank D alone into **A new bank**. It holds the VA
pack in slots 17–32 and nothing in 1–16, which the 8-Bit presets left empty. In that bank, copy slot
18's patch over slot 17 with **Copy to…**. Run **Write patches to the FM1…** for FM1 bank D from
that bank. Expected: the confirmation lists only preset 113, now named as 114. Write it, then read
097–112 in the probe and compare each with the pack backup: all 16 must be unchanged.

## 6. Write timing (T1–T4)

The editor sends a preset write about 3 s after the last, having listened 1.5 s after each for a
reply that `FM-1_093` never sent before reading it back. FM-1+VA's Device Manager reads each write
back at once and sends the next 120 ms later. These runs find how close writes can safely be.

The **Write timing** section at the bottom of the preset probe walks through each run in numbered
steps. It reads the chosen presets, writes each back with exactly the same bytes, and reads it
again, stopping at the first that does not read back the same, so the FM1 ends up holding what it
held. Each finished run is logged in a table with a **Crackle** choice for what you heard, and
**Copy all runs** copies the whole log as JSON for the ledger.

| Test | First preset, how many            | Timing                                                 | Purpose                                                                               |
| ---- | --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| T1   | 097, 16                           | T1: today's timing                                     | The baseline                                                                          |
| T2   | 097, 16                           | Each T2 timing in turn, 1000 ms down to straight after | Whether checking at once still sees the write, and where crackle or a mismatch starts |
| T3   | 001, 32                           | The fastest T2 timing that ran clean                   | A whole bank, the size **Write patches to the FM1…** writes                           |
| T4   | the preset selected on the FM1, 1 | T2: check at once, next write straight after           | Whether writing the playing preset glitches what is sounding                          |

Hold a note on the FM1 during every run. Work down the T2 timings one run at a time and stop at
the first that crackles or stops on a mismatch; the timing before it is the fastest clean one. If
the FM1 also runs an earlier release you can test, such as `FM-1_093`, repeat T2 there: the 3 s
came from Baud Girl's page for those releases, so a shorter gap may hold only from `FM-1_096`.

## 7. Clean-up

In the Device Manager, **Install a backup** with the §0.2 presets file, then **Send**, which
rewrites only the presets that differ from it. Reinstall the packs afterwards if you want to keep
them. Check that GLOBE's MIDI Channel is All again.

## 8. Ledger

| Test                   | Result | Bytes / notes |
| ---------------------- | ------ | ------------- |
| Version and build date |        |               |
| F1                     |        |               |
| F2                     |        |               |
| F3                     |        |               |
| F4                     |        |               |
| F5                     |        |               |
| M1                     |        |               |
| M2                     |        |               |
| M3 FM / 8-Bit / VA     |        |               |
| M4                     |        |               |
| B1                     |        |               |
| B2                     |        |               |
| B3                     |        |               |
| B4                     |        |               |
| B5                     |        |               |
| B6                     |        |               |
| B7                     |        |               |
| FX CCs after B5–B6     |        |               |
| K1                     |        |               |
| K2                     |        |               |
| K3                     |        |               |
| L1                     |        |               |
| L2                     |        |               |
| L3                     |        |               |
| L4                     |        |               |
| E1                     |        |               |
| E2                     |        |               |
| W1                     |        |               |
| T1                     |        |               |
| T2 1000 ms             |        |               |
| T2 500 ms              |        |               |
| T2 250 ms              |        |               |
| T2 120 ms              |        |               |
| T2 0 ms                |        |               |
| T3                     |        |               |
| T4                     |        |               |

Record each result in `docs/fm1-research.md`, "FM-1_096", raising a fact from **Likely** to
**Confirmed, seen once** where the FM1 agrees, and add the captures as fixtures in
`src/test/fm1-va-captures.ts`.
