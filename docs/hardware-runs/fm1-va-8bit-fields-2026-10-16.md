# FM-1+VA 8-Bit field tests on FM-1_098, 2026-10-16

Plan: [`docs/fm1-va-096-tests.md`](../fm1-va-096-tests.md) §4b (P1–P7), plus the 8-Bit Note Engine
row from backlog item 10 ("Map the 8-Bit Note Engine row"), run on `FM-1_098` over USB from macOS
Chrome, development build, through the preset probe. The table checked is "Every field of an 8-Bit
preset" in [`docs/fm1-research.md`](../fm1-research.md). The editor sent only the preset read
(`7D 10`) to the FM1; every change was made by hand on the FM1 and stored with SAVE.

- Version: `FM-1_098`, built 2026-10-10 (About screen)
- Backups: `fm1-presets-2026-10-16.syx` and `fm1-patterns-2026-10-16.syx` from the Device Manager,
  taken with preset 097 already NES ROCK from the 8-Bit pack, so the presets file is also the
  **pack backup** (the files stay on the tester's machine, not in the repository)
- Preset under test: 097, NES ROCK. GLOBE left at MIDI Channel All, FX Channel 2

Every read of 097 was diffed against the one before it with the repository's `unpackDx7Voice`,
which gives the edit-buffer (**E**) bytes below. A packed voice byte is a byte of the 128 the probe
shows.

## Results

| Test                         | Result | Bytes / notes                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                     | Done   | 097 read before any change: byte 18 `C3`, record 19–22 `04 00 01 00`, 26 `45`, 30 `00`; identical to the FM-1_097 read of 2026-10-10 in record and voice                                                                                                                                                      |
| P1 Bass Wave                 | Pass   | Triangle → Pulse 50: record 19 `04` → `02` (bits 0–3 4 → 2, bits 4–7 still 0). Record 30 `00` → `01` as well, the SAVE repair of the pack's effect chain seen in the 097 run (K3, L4); not part of the field. No voice byte moved                                                                             |
| P2 Key, to Off               | Pass   | E → Off: record 26 `45` → `40`: the mark stays, Key 0, Accidentals (bit 5) unchanged. Nothing else                                                                                                                                                                                                            |
| P2 Key, to C                 | Pass   | Off → C: record 26 `40` → `41`. Nothing else                                                                                                                                                                                                                                                                  |
| P3 Drum F0 Pitch             | Pass   | 40 → 50 on the screen: E 0 `28` → `32` (40 → 50), packed voice byte 0. Nothing else                                                                                                                                                                                                                           |
| P4 Drum Decay, to 60         | Pass   | 50 → 60: E 15 0 → 2 (packed byte 13 `00` → `08`), E 36 0 → 1 (packed byte 30 `00` → `04`), E 14 stays 0. Stored value +10                                                                                                                                                                                     |
| P4 Drum Decay, to 40         | Pass   | 60 → 40: E 14 0 → 1, E 15 2 → 6, E 36 1 → 6 (packed byte 13 `08` → `19`, byte 30 `04` → `18`). The seven bits are `1110110`, −10 in two's complement: bits 0–2 in E 15, bits 3–5 in E 36, bit 6 in E 14, as the table says                                                                                    |
| P5 Lead User Arpeggio Step 1 | Pass   | End → +3, with Key set to Off and Arpeggio to User first (the row was Off): record 47 `FF` → `EF` (bits 0–4 31 → 15, bits 5–7 still set), record 22 `00` → `20` (Arpeggio User, 32), record 26 `41` → `40` (the Key Off done for it). Records 48–51 stay `FF`; nothing else in 47–51; no voice byte           |
| P6 Lead Octave               | Pass   | 0 → +2: E 76 3 → 5 (packed voice byte 63 `23` → `25`). Stored + 3. Nothing else                                                                                                                                                                                                                               |
| P7 Bass Level                | Pass   | 95 → 50: E 61 `5F` → `32` (packed voice byte 50), the level itself. Nothing else; the same byte as L4 on 097                                                                                                                                                                                                  |
| P7 Lead Mono                 | Pass   | Off → On: E 101 0 → 1 (packed voice byte 83 `08` → `09`). Nothing else                                                                                                                                                                                                                                        |
| Note Engine, bass            | Seen   | Auto-Arp → Auto-Chord: E 35 `00` → `01` (packed voice byte 30 `18` → `19`), nothing else, no record byte. Back to Auto-Arp: E 35 `01` → `00`, and the read is identical to the one before the change. Arp Speed, Pattern, and User Arpeggio grey out in Auto-Chord, and Arp Speed is active again in Auto-Arp |
| Note Engine, lead            | Seen   | Auto-Arp → Auto-Chord: E 35 `00` → `02` (packed voice byte 30 `18` → `1A`), nothing else, no record byte. Back to Auto-Arp: E 35 `02` → `00`, and the read is identical to the baseline. In Auto-Chord the lead's Arp Speed, Pattern, and User Arpeggio rows grey out                                         |
| Restore                      | Done   | 097 reinstalled from the pack backup through the Device Manager's **Install a backup**, **Send**. The read is identical to the baseline in record, voice, and the raw reply. Which presets Send listed was not noted. MIDI Channel is All                                                                     |

All seven P tests matched the expected bytes. The only byte that moved outside a field was record
30 (`00` → `01`) at the first SAVE, which the 097 run saw too; the later SAVEs left it at `01`.

## Unexpected

- **The Note Engine is E 35, both parts, in one byte.** Bass takes bit 0 and lead bit 1. It is not
  at E 97 or E 118, which sit in the table's unread list, nor at one byte a part. E 35 is in that
  list too, so no preset byte the table counts as read moved, and a pack preset (E 35 `00`, both
  Auto-Arp) reads the same.
- **Packed voice byte 30 holds two fields.** The Note Engine bits are its bits 0–1 (E 35) and Drum
  Decay's E 36 sits in bits 2–4. P4 changed the decay without moving E 35, and the Note Engine reads
  changed E 35 without moving E 36, so the two do not interfere.
- The Note Engine has two choices, Auto-Arp and Auto-Chord, on each part. Only 097 was tested, so
  whether the other 15 pack presets hold E 35 `00` is unchecked.

## For fm1-research.md

Not edited now; the file is being edited on another branch. In "Every field of an 8-Bit preset":

1. **Note Engine row (new).** In the bass and lead table, add **Note Engine**: Bass E 35 bit 0, Lead
   E 35 bit 1; 0 Auto-Arp, 1 Auto-Chord. Seen once on `FM-1_098`; in Auto-Chord each part's Arp Speed, Pattern, and User Arpeggio rows
   grey out while their bytes stay as they were (no read changed them), so it is like the other rows the FM1 dims and keeps
   (Arpeggio, Duty Sequence).
2. **The unread list.** "The 8-Bit preset reads none of E 17, 35, 97, 118, 126–133, 134, 135, or
   136" is wrong for E 35 bits 0–1: they are the Note Engine. The list should say E 35 holds the
   Note Engine in bits 0–1 and the preset reads no other bit of it. The other bytes in the list
   were not touched by any test here.
3. **Raise to Confirmed, seen once** on `FM-1_098` (2026-10-16, this ledger): the Bass Wave
   (record 19 bits 0–3); the Key (record 26: the mark, Key 0, and Key C; Accidentals was not
   changed); a drum's Pitch (E 0); Drum Decay (E 15, E 36, and E 14 as the table splits it); the
   Lead's User Arpeggio step 1 (record 47 bits 0–4, +3 stored as 15) and Arpeggio 32 for User
   (record 22); the Lead's Octave (E 76, stored + 3) and Mono (E 101 bit 0); and the Bass Level
   (E 61). The Bass's Octave and Mono, the Lead's Wave, Level, and Arpeggio table cells, and the
   other fields stay **Likely** here (L4 on `FM-1_097` already confirmed the Lead Level at E 124).
4. **Pack presets and "Checked offline".** The pack's 097 holds record 30 `00` and the edit buffer's
   E 35 `00`. The first SAVE on `FM-1_098` still rewrites record 30 to `01` (Reverb into chain
   position 1), as on 097.
5. **Still open.** D2 (one DX7 parameter change over an 8-Bit preset) and the rest of the table's
   fields (Scale, Voicing, Lead Follows, Arp Sync, Tone, Tuning, Chord, Pattern, Arp Speed,
   Attack and the other envelope fields, Vibrato, Glide, Sweep, Choke, drum Wave, Duty Sequence,
   Accidentals) were not run.

## Raw captures

Copy capture JSON for each read, in order, beside this file:

- `fm1-va-8bit-fields-capture-097-baseline-2026-10-16.json`
- `…-p1-…`, `…-p2a-key-off-…`, `…-p2b-key-c-…`, `…-p3-drum-pitch-…`, `…-p4a-decay-60-…`,
  `…-p4b-decay-40-…`, `…-p5-lead-user-arp-…`, `…-p6-lead-octave-…`, `…-p7a-bass-level-…`,
  `…-p7b-lead-mono-…`
- `…-ne-bass-chord-…`, `…-ne-bass-arp-…`, `…-ne-lead-chord-…`, `…-ne-lead-arp-…`
- `…-restored-…` (097 after the restore)

All carry the `fm1-va-8bit-fields-capture-097-` prefix and `-2026-10-16.json` suffix. The map is
`fm1-va-8bit-fields-map-2026-10-16.json`.

## Copy map

```json
{
  "firmware": "FM-1_098",
  "entries": [
    {
      "preset": "097",
      "record": [
        { "from": "04", "index": 19, "to": "02" },
        { "from": "00", "index": 30, "to": "01" }
      ],
      "setting": "Bass Wave Triangle → Pulse 50",
      "voice": []
    },
    {
      "preset": "097",
      "record": [{ "from": "45", "index": 26, "to": "40" }],
      "setting": "Key E → Off",
      "voice": []
    },
    {
      "preset": "097",
      "record": [{ "from": "40", "index": 26, "to": "41" }],
      "setting": "Key Off → C",
      "voice": []
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Drums F0 Pitch +10",
      "voice": [{ "from": "28", "index": 0, "to": "32" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Drum Decay 50 → 60",
      "voice": [
        { "from": "00", "index": 13, "to": "08" },
        { "from": "00", "index": 30, "to": "04" }
      ]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Drum Decay 60 → 40",
      "voice": [
        { "from": "08", "index": 13, "to": "19" },
        { "from": "04", "index": 30, "to": "18" }
      ]
    },
    {
      "preset": "097",
      "record": [
        { "from": "00", "index": 22, "to": "20" },
        { "from": "41", "index": 26, "to": "40" },
        { "from": "FF", "index": 47, "to": "EF" }
      ],
      "setting": "Lead User Arpeggio Step 1 End → +3",
      "voice": []
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Lead Octave +2",
      "voice": [{ "from": "23", "index": 63, "to": "25" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Bass Level 95 → 50",
      "voice": [{ "from": "5F", "index": 50, "to": "32" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Lead Mono Off → On",
      "voice": [{ "from": "08", "index": 83, "to": "09" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Bass Note Engine Auto-Arp → Auto-Chord",
      "voice": [{ "from": "18", "index": 30, "to": "19" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Bass Note Engine Auto-Chord → Auto-Arp",
      "voice": [{ "from": "19", "index": 30, "to": "18" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Lead Note Engine Auto-Arp → Auto-Chord",
      "voice": [{ "from": "18", "index": 30, "to": "1A" }]
    },
    {
      "preset": "097",
      "record": [],
      "setting": "Lead Note Engine Auto-Chord → Auto-Arp",
      "voice": [{ "from": "1A", "index": 30, "to": "18" }]
    }
  ]
}
```
