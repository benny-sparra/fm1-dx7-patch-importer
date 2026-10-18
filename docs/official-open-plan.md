# Official Open: implementation plan

Drafted 2026-10-18. M-VAVE released Official Open as V12 on 2026-10-16 and V13 on 2026-10-17
(`FM-1_8000013`, https://github.com/m-vave/fm1_open commit `b178ac43`). It is likely to become what
new FM1s ship with, so this plan makes the editor the better place to edit and keep what an Official
Open FM1 plays, measured against M-VAVE's own FM1 Workbench (https://open.m-vave.com/fm1-workbench,
V13 as read today).

What the firmware is and what its protocol does is in
[the research notes](fm1-research.md#m-vaves-official-open-firmware). This plan only says what to
build, in what order, and what each step needs approved first.

## Decisions

Three of `AGENTS.md`'s rules stood between this plan and its later phases. Each is the user's call,
recorded in `AGENTS.md` before any code depends on it.

1. **Projects in the library: approved 2026-10-18.** The library may store and organise Official
   Open projects without editing their steps, as `AGENTS.md`'s sequencer scope now says. Phases 5
   and 7 may go ahead, each transfer still needing its protocol approval.
2. **Step editing: a nice to have, last (2026-10-18).** Official Open's steps are its own fixed
   model (8 tracks, 16–64 steps, chords, locks), so an editor for them stays within "edit the
   FM1's internal sequencer". It is Phase 8, after everything else, and needs its scope approved
   in `AGENTS.md` before work starts.
3. **Saving to a project slot (command 7) and loading one (command 8): parked 2026-10-18.** Both
   stay **Dangerous / excluded**. Without them the editor puts a sound or a project into the FM1's
   working project, the user presses SAVE on the FM1 to keep it, and the editor backs up only the
   working project. Revisit once Phases 1–3 have worked on the FM1; Phase 6 waits for it.

The protocol approvals each phase needs are listed with it.

## Where the Workbench is ahead, and where it is weak

| Area                 | Workbench V13                                                                                         | Editor today                                                               | Target                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| DX7 sound editing    | The simulated panel: LCD pages, knobs, an envelope graph                                              | Full voice editor, presets, randomise, undo, compare, sent live as dumps   | Keep; add the track's level, sends, and LFO beside the voice                        |
| Other engines        | Panel pages for 303, 808, PSG, Pluck, Sampler                                                         | None                                                                       | A rack editor for each, live where the engine takes controllers                     |
| Keeping sounds       | One `.fm1t` file per export; "Save in this browser" for projects only, lost when site data is cleared | 128-slot banks, saved banks, favourites, search, duplicates, backups, undo | Track sounds of every engine in banks, searchable, backed up with everything else   |
| DX7 libraries        | Imports one `.syx` voice or bank, one voice at a time into one track                                  | Catalog of bundled banks, search across all, import/export, share links    | Keep; one click puts any patch on a DX7 track                                       |
| Projects             | Read the working project, save to a slot with read-back, export/import `.fm1`, a few browser saves    | None                                                                       | A project library (decision 1); back up every slot at once (decision 3)             |
| Reading the FM1      | Working project only; other slots one at a time by loading each                                       | Engines per track (command 0)                                              | Read a track's voice, its sound, the working project, and slot names                |
| Sample bank          | WAV trim and encode, read and write the bank with verification                                        | None                                                                       | Keep `.fm1s` files in the backup only; writing stays excluded                       |
| Microtuning (V13)    | Firmware API only; "a dedicated tuning editor is not included"                                        | None                                                                       | A tuning editor and scale library (Phase 7), the clearest thing the Workbench lacks |
| Simulator            | WebAssembly simulator of the whole device                                                             | None; audition plays the FM1                                               | Not pursued                                                                         |
| Firmware install     | Update, force flash, restore V15                                                                      | Links to it from the firmware page                                         | Not pursued: OTA stays excluded                                                     |
| Languages, platforms | English and Simplified Chinese, desktop Chrome and Edge                                               | Eight locales, phones and tablets, any browser with Web MIDI               | Keep                                                                                |

The editor wins on keeping and finding sounds, on DX7 editing, and on reach. It needs the other five
engines and a way to read what is on the FM1 before it is the better tool.

## Phase 0: catch up with V13 (no approvals needed)

- Record V13's changes in `docs/fm1-research.md`: the optional 200-byte tuning block after a
  project (`FM1T` magic, 8 × 24-byte tables, CRC), transfer kind 3 (a 4,264-byte tuned project),
  command 21 (tuning support, tuned project size, sample bank limit), the tuning sector in the last
  4 KiB of Flash, and the sample bank limit shrinking by 4 KiB. Check whether `groove_preset` or the
  project layout moved (`app/instrument.h`, `app/project.c` diff).
- Check that the badge reads `FM-1_8000013` as V13, with a test, and run the identity query and
  command 0 on the orange FM1 once it is on V13.
- Answer the open question of the port's name on Windows and Linux if anyone can capture it.
- Update [Switching FM1 firmware](switching-firmware.md) with the Workbench's restore and
  force-flash steps, sending people to **Download backup** first (an existing backlog item).

## Phase 1: read what the FM1 holds (approval: commands 1, 2, 6, and 9)

The read-only half of the transfer protocol. Nothing it does changes the FM1.

- **Codec** in `src/lib/official-open-transfer.ts`: command 1 (begin export, kinds 0–3), command 2
  (chunks of 64 bytes at a 16-bit offset), command 6 (cancel), command 9 (slot name), and CRC-32,
  with fixtures from a hardware capture. A fresh token per request and three tries a second apart,
  as the Workbench does.
- **Reader** in a lazy module beside `official-open-track-send.ts`, sharing its queue turn so
  nothing lands between chunks; cancelled when the ports change, as the FM-1+VA preset read is.
- **Read a track's DX7 voice** (kind 1) into a library slot, from the track status or a slot menu:
  the reverse of today's send.
- **Read a track's sound** (kind 2, 223 bytes) for any engine, once Phase 2 can store it.
- **Read the working project** (kind 0, or kind 3 where command 21 says tuning is supported) and
  the 16 slot names, once Phase 5 can store it.
- Hardware run on V13 for each kind before it ships.

## Phase 2: track sounds in the library (no protocol; storage format change)

Official Open's unit of sound is the 223-byte track preset (`struct groove_preset`, mapped in the
research notes): engine, sound bytes, level, sends, LFO, and arpeggiator.

- **Stored shape.** A new snapshot map, `openTrack`, by slot id, holding the 223 bytes exactly as
  read, as `virtualAnalog` and `eightBit` hold FM-1+VA presets. DX7 paths meet the slot as empty.
  Workspace version 10, saved banks version 5, backup version 6, each with its upgrade path and
  fixtures per `AGENTS.md`. A DX7-engine preset keeps its voice in `voices` and its other bytes
  (level, sends, LFO) in `openTrack`, so DX7 tools keep working on it.
- **Cards.** An `EngineTag` for each engine (303, 808, PSG, PL, SM), lit like VA and 8B; sound keys
  per engine so duplicates and favourites match within one engine.
- **Files.** Import and export `.fm1t` (16-byte `FM1T` header, version 1, CRC-32), several at once,
  and a bank as a zip through `fflate`. **Download patch** on a DX7 patch offers `.fm1t` as well as
  `.syx` while the FM1 runs Official Open (an existing backlog item).
- **Validation** of every engine's bytes on read, as the research notes give the limits; a byte out
  of range is kept and flagged, not clamped, until a hardware run says what the FM1 does with it.

## Phase 3: put sounds on the FM1 (approval: commands 3, 4, 5 for kinds 1 and 2)

RAM only: the working project changes, the slot does not, and the notification says to press SAVE on
the FM1, as the DX7 dump's already does.

- **Send a track sound** (kind 2) from a slot to the track it is chosen for, after command 0, with a
  warning that the FM1 may clear the track's steps when the engine changes (a hardware run to see
  when). Read the track's current sound first and offer Undo that puts it back, which the
  Workbench cannot do.
- **DX7 voices keep the single-voice dump**; kind 1 writes only if the dump turns out to miss
  something.
- **Choose the track in the app**, not only by the note channel: a track picker in the track status
  (tracks 1–8, channels 1–7 and 10), so sending to track 5 does not mean changing the note channel.

## Phase 4: editors for the other five engines (approval: their controllers, below)

Each in the voice editor's lazy chunk, sharing the rack panels and the FM-1+VA editors' rule: a row
writes only its own bits, only when its value changed.

- **303** (Cutoff, Reso, EnvMod, Decay, Accent, Wave, Tune, Volume, Drive, DrvTyp, Slide, AccDec),
  **PSG** (Mode, Noise, Tune, Release), **Pluck** (Decay, Bright, Tune, Release), **Sampler** (per
  slot Level, Tune, Length, Choke, Variation, Vel LPF), **808** (eleven parts and Kit, once the
  variant question in the research notes is answered).
- **Shared rows** on every engine: track level, reverb and delay sends, the track LFO (rate, depth,
  target, wave), and the arpeggiator's six settings.
- **Live.** Where the engine takes a controller (303 CC 5, 71, 74, 75; PSG CC 72, 74; Pluck CC 72,
  74, 75; CC 7 and 91 everywhere) send it on the track's channel while a gesture moves; send the
  whole preset (kind 2) when the gesture ends, as the DX7 editor sends a dump. These CCs need their
  own approval, built only by a module that refuses every other controller, as
  `makeFm1VaSoundControlMessage` does.
- **Presets and randomise** per engine, heard on the FM1 before they ship.
- **The DX7 editor on Official Open** gains the shared rows for a patch that has them.

## Phase 5: a project library (decision 1)

- **Stored shape.** A new IndexedDB store, `projects` (an additive schema bump to 3): the 4,064-byte
  payload, or 4,264 with tuning, exactly as read, with its name, date, and source. In the backup
  file from version 6.
- **Files.** Import and export `.fm1` (16-byte `FM1P` header, versions 3 and 4, CRC), format 3
  upgraded on read as the Workbench does, the original kept.
- **View.** A project list with the eight tracks of each: engine, sound name, level, sends. Copy a
  track's sound out of a project into a bank, or a bank's sound into a project's track: assembling
  a project from the library, which is sound work, not sequencing.
- **Send a project** to the working project (kind 0 or 3 write, approval needed), after reading the
  current one so Undo can put it back, with read-back verification as the Workbench does.

## Phase 6: back up the whole FM1 (decision 3, parked)

Parked until Phases 1–3 have worked on the FM1 and decision 3 is revisited.

- **Save to a slot** (command 7) with the Workbench's sequence: write, read back and compare, save,
  load the slot, read back again. Asks first, naming the slot it replaces; slot 15 also holds the
  device settings, which the dialog says.
- **Back up every slot** in one action: read the working project, then load and read each named
  slot (command 8), then put the working project back. Every unsaved edit on the FM1 is at risk,
  so it asks first and refuses while the FM1 says its project is modified.
- **Restore** a set of projects to their slots, one confirmation naming every slot.

## Phase 7: microtuning (V13; decision 1)

M-VAVE added per-track tuning in V13 with no editor. Twelve cent offsets per track, a second table
for alternate notes, kept in the project's tuning block.

- A tuning editor per track: a keyboard of twelve cent offsets, the alternate table, presets
  (just intonation, meantone, maqam and raga scales), Scala `.scl` import.
- A tuning library beside the banks, and tunings sent as part of a project (kind 3).
- Needs a hardware run of a tuned project before anything ships, and approval of the kind 3 write.

## Phase 8: step editing (nice to have)

Last, and only once Phases 1–5 are in. The project's steps as Official Open models them, and
nothing a general sequencer adds (`AGENTS.md`, Sequencer scope).

- Per track: the step grid at its loop length (16, 32, 48, or 64), notes or drum parts, and each
  step's velocity, gate, probability, chord, and tie.
- Edits a project in the library, byte for byte, and reaches the FM1 by Phase 5's project send.
- Needs its scope recorded in `AGENTS.md` first, and the step layout mapped in
  `docs/fm1-research.md` from the source and a hardware run.

## Out of scope

- The firmware installer, the `00 59` update family beyond the identity query, and the sample bank
  write (commands 12–14): **Dangerous / excluded**.
- The WebAssembly simulator.
- Sample editing; `.fm1s` files are kept in backups and files only.

## Throughout

- **Bundle.** Every phase lazy: the reader, the writer, the engine editors, and the project library
  load on first use; the entry gains only triggers and profile capabilities. Measure each with
  `npm run bundle:check` against the 167 KiB budget.
- **Profile.** Each new ability is a capability in `familyProfiles`' `official-open` entry, from the
  release it was tested on.
- **Locales.** Every string in all eight locales; engine names stay in English as printed on the FM1.
- **Hardware.** The orange FM1 runs Official Open. Each protocol step gets a captured run in
  `docs/hardware-runs/` and fixtures before its code ships.
- **Docs.** The user guide, help guide, and README follow each phase.

## Suggested order and size

| Phase | Depends on                | Rough size | Value                                        |
| ----- | ------------------------- | ---------- | -------------------------------------------- |
| 0     | nothing                   | small      | V13 correct, firmware guide                  |
| 1     | approval                  | medium     | Read voices and sounds off the FM1           |
| 2     | nothing (files), 1 (read) | large      | The library holds every engine               |
| 3     | 1, 2, approval            | medium     | One click puts any library sound on a track  |
| 4     | 2, 3, approval            | large      | Edits every engine better than the panel     |
| 5     | decision 1, 1             | large      | Projects kept and assembled from the library |
| 6     | decision 3 (parked), 5    | medium     | Whole-device backup in one action            |
| 7     | decision 1, 5             | medium     | The one feature M-VAVE does not offer        |
| 8     | decision 2, 5             | large      | Steps edited off the FM1 (nice to have)      |

Phases 0 and 2's file half can start at once; 1 needs only its approval and a hardware run.
