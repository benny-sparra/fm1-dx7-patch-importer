# Official Open: implementation plan

Drafted 2026-10-18. M-VAVE released Official Open as V12 on 2026-10-16 and V13 on 2026-10-17
(`FM-1_8000013`, https://github.com/m-vave/fm1_open commit `b178ac43`). It is likely to become what
new FM1s ship with, so this plan makes the editor the better place to edit and keep what an Official
Open FM1 plays, measured against M-VAVE's own FM1 Workbench (https://open.m-vave.com/fm1-workbench,
V13 as read today).

What the firmware is and what its protocol does is in
[the research notes](fm1-research.md#m-vaves-official-open-firmware). This plan only says what to
build, in what order, and what each step needs approved first.

## Principles

- **The editor stays centred on sounds.** Official Open keeps sounds only inside a project's eight
  tracks: 8 in the working project and 8 in each of 16 user slots, with no list of sounds to choose
  from. The browser becomes the home of a collection, for every engine, and that is what this
  editor does best. Every firmware keeps the same library.
- **It knows about the current project.** On Official Open an eight-track strip above the library
  shows each track's engine and sound, with **Save project** and **Open project** beside it. A
  sound is picked below and sent to a track above. On other firmware the strip does not appear.
- **The FM1 is where a song is put together.** The browser is where its sounds come from and where
  copies of it are kept. Steps are edited on the FM1 until Phase 10.
- **Banks keep 32 slots.** On Official Open a bank is a crate of sounds, not a place on the device;
  on other firmware A–D are still the FM1's banks. Finding a sound among thousands is the job of
  categories, the engine filter, search, and favourites (Phase 6), not of bank size.
- **Engines stay out of the way.** A card's tag names its engine and opening a sound opens its
  editor, so nobody has to think about engines; filters are there for those who do. The editor
  steps in only where an engine matters: a drum sound sent to a melodic track, or the reverse,
  makes the FM1 clear steps, and only DX7 sounds reach other firmware.

## Decisions

The user's calls, each recorded in `AGENTS.md` before any code depends on it.

1. **Projects in the library: approved 2026-10-18.** The library may store and organise Official
   Open projects without editing their steps, as `AGENTS.md`'s sequencer scope now says. Phases 4,
   7, and 9 may go ahead, each transfer still needing its protocol approval.
2. **Step editing: a nice to have, last (2026-10-18).** Official Open's steps are its own fixed
   model (8 tracks, 16–64 steps, chords, locks), so an editor for them stays within "edit the
   FM1's internal sequencer". It is Phase 10, after everything else, and needs its scope approved
   in `AGENTS.md` before work starts.
3. **Saving to a project slot (command 7) and loading one (command 8): parked 2026-10-18.** Both
   stay **Dangerous / excluded**. Without them the editor puts a sound or a project into the FM1's
   working project, the user presses SAVE on the FM1 to keep it, and the editor backs up only the
   working project. Revisit once Phases 1–3 have worked on the FM1; Phase 8 waits for it.
4. **Bundling Official Open's factory sounds: planned on M-VAVE's permission (2026-10-18).** The
   128 track sounds in its 16 factory projects are GPL-3.0 source and this app is MIT. The plan
   assumes M-VAVE agrees; their permission is recorded, in writing, in the repository before the
   set ships (Phase 6). Without it, the editor reads the factory projects from the user's own FM1
   instead and bundles nothing.

The protocol approvals each phase needs are listed with it.

## Where the Workbench is ahead, and where it is weak

| Area                 | Workbench V13                                                                                         | Editor today                                                               | Target                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| DX7 sound editing    | The simulated panel: LCD pages, knobs, an envelope graph                                              | Full voice editor, presets, randomise, undo, compare, sent live as dumps   | Keep; add the track's level, sends, and LFO beside the voice                          |
| Other engines        | Panel pages for 303, 808, PSG, Pluck, Sampler                                                         | None                                                                       | A rack editor for each, live where the engine takes controllers                       |
| Keeping sounds       | One `.fm1t` file per export; "Save in this browser" for projects only, lost when site data is cleared | 128-slot banks, saved banks, favourites, search, duplicates, backups, undo | Track sounds of every engine in banks, searchable, backed up with everything else     |
| Finding sounds       | 16 factory projects; 16 built-in FM programs                                                          | DX7 catalog of bundled banks, search across all banks                      | Categories, engine filter, a browsable catalog for every engine, starter sets         |
| DX7 libraries        | Imports one `.syx` voice or bank, one voice at a time into one track                                  | Catalog of bundled banks, search across all, import/export, share links    | Keep; one click puts any patch on a DX7 track                                         |
| Projects             | Read the working project, save to a slot with read-back, export/import `.fm1`, a few browser saves    | None                                                                       | Save and reopen projects in the browser (decision 1); back up every slot (decision 3) |
| Reading the FM1      | Working project only; other slots one at a time by loading each                                       | Engines per track (command 0)                                              | Read a track's voice, its sound, the working project, and slot names                  |
| Sample bank          | WAV trim and encode, read and write the bank with verification                                        | None                                                                       | Keep `.fm1s` files in the backup only; writing stays excluded                         |
| Microtuning (V13)    | Firmware API only; "a dedicated tuning editor is not included"                                        | None                                                                       | A tuning editor and scale library (Phase 9), the clearest thing the Workbench lacks   |
| Simulator            | WebAssembly simulator of the whole device                                                             | None; audition plays the FM1                                               | Not pursued                                                                           |
| Firmware install     | Update, force flash, restore V15                                                                      | Links to it from the firmware page                                         | Not pursued: OTA stays excluded                                                       |
| Languages, platforms | English and Simplified Chinese, desktop Chrome and Edge                                               | Eight locales, phones and tablets, any browser with Web MIDI               | Keep                                                                                  |

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
- **Read a track's DX7 voice** (kind 1) into a library slot, from the track strip or a slot menu:
  the reverse of today's send.
- **Read a track's sound** (kind 2, 223 bytes) for any engine, once Phase 2 can store it.
- **Read the working project** (kind 0, or kind 3 where command 21 says tuning is supported) and
  the 16 slot names, once Phase 4 can store it.
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
- **Other firmware.** Only a DX7 sound reaches it. A bank sent or downloaded as DX7 gets INIT VOICE
  in place of another engine's sound and says so, as Virtual Analog patches do.
- **Files.** Import and export `.fm1t` (16-byte `FM1T` header, version 1, CRC-32), several at once,
  and a bank as a zip through `fflate`. **Download patch** on a DX7 patch offers `.fm1t` as well as
  `.syx` while the FM1 runs Official Open (an existing backlog item).
- **Validation** of every engine's bytes on read, as the research notes give the limits; a byte out
  of range is kept and flagged, not clamped, until a hardware run says what the FM1 does with it.

## Phase 3: put sounds on the FM1 (approval: commands 3, 4, 5 for kinds 1 and 2)

RAM only: the working project changes, the slot does not, and the notification says to press SAVE on
the FM1, as the DX7 dump's already does.

- **The track strip** (Principles) grows out of today's track status: each of the eight tracks with
  its engine and sound, read with command 0 and Phase 1's reads, and the track a click sends to.
  Sending to track 5 does not mean changing the note channel.
- **Send a track sound** (kind 2) from a slot to the chosen track, after command 0. A sound that
  moves a track between a drum engine (808, Sampler) and a melodic one warns first that the FM1
  clears the steps that do not fit (a hardware run to see exactly when). Read the track's current
  sound first and offer Undo that puts it back, which the Workbench cannot do.
- **DX7 voices keep the single-voice dump**; kind 1 writes only if the dump turns out to miss
  something.

## Phase 4: save and open projects (decision 1; approval: kind 0 and 3 writes)

Saving a song to the browser is the everyday workflow, so it comes straight after sending sounds.

- **Stored shape.** A new IndexedDB store, `projects` (an additive schema bump to 3): the 4,064-byte
  payload, or 4,264 with tuning, exactly as read, with its name, date, and source. In the backup
  file from version 6.
- **Save project** beside the track strip reads the working project (Phase 1) into the store.
- **Open project** sends a stored project to the working project (kind 0 or 3 write), after reading
  the current one so Undo can put it back, with read-back verification as the Workbench does. The
  notification says to press SAVE on the FM1 to keep it in a slot.
- **A project list:** name, date, and the eight engines; rename and delete, with Undo.
- **Files.** Import and export `.fm1` (16-byte `FM1P` header, versions 3 and 4, CRC), format 3
  upgraded on read as the Workbench does, the original kept.

## Phase 5: editors for the other five engines (approval: their controllers, below)

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
  whole preset (kind 2) when the gesture ends, as the DX7 editor sends a dump. 808 and Sampler take
  no sound controllers, so they send the whole preset at each gesture's end. These CCs need their
  own approval, built only by a module that refuses every other controller, as
  `makeFm1VaSoundControlMessage` does.
- **Randomise** per engine, kept within ranges that sound, so it works as a generator with Undo.
- **The DX7 editor on Official Open** gains the shared rows for a patch that has them.

## Phase 6: finding sounds (storage format change; decision 4 for the factory set)

A library of thousands of sounds across six engines needs more than banks and a name search.

- **Categories.** A fixed list, translated in every locale: Bass, Lead, Pad, Keys, Bell, Pluck,
  Brass, Strings, Organ, Drums, Percussion, FX. A sound has none, one, or several. A fixed list
  filters reliably and reads the same in every language; free-form tags wait until someone asks.
  This reopens "Tags, ratings, and favourites", which the backlog decided against while the library
  was 32-slot banks of one engine. Stored as a new optional field, with the version bump, upgrade
  path, and fixtures `AGENTS.md` asks for, in saved banks, backups, and favourites.
- **Suggested, not chores.** Bundled sounds carry their categories. For a DX7 voice the name often
  says it (`BASS 1`, `E.PIANO`), so the editor suggests a category for the user to accept; nothing
  is tagged without asking.
- **Filters.** Engine and category chips in the banks and in search across all banks, together
  with favourites.
- **Browse sounds.** The bundled catalog for every engine, outside the library as the DX7 catalog
  is: filtered by engine and category, each sound heard on the FM1 with a click, kept with **Add
  to bank**. The library itself starts as small as it does today.
- **Starter sets.** A hand-picked bank of about 32 per engine (Starter 303s, Starter kits), so a
  newcomer meets a dozen good basses rather than two thousand.
- **Where the sounds come from:**
  - **Official Open's factory projects:** 128 track sounds across all six engines, designed by
    M-VAVE, bundled on their permission (decision 4) and credited to them. Without it, **Import
    factory sounds from the FM1** reads them from the user's own device.
  - **The editor's own presets** for 303, PSG, and Pluck, whose few controls make a good set quick
    to design, and 808 kits and parts once its variants are understood. Each ships only once heard
    on an FM1, as the 8-Bit presets did.
  - **The DX7 catalog**, already thousands of voices, which play on DX7 tracks as they are.
  - **The community:** `.fm1t` files shared on M-VAVE's forum, imported in bulk, and share links
    (`#p=`) extended to Official Open sounds, as a new link version the codec reads beside 1.
- **Sampler sounds** say which of the FM1's 8 samples to play and how, so they depend on its sample
  bank. Bundle them only for the bank Official Open ships with, and say so on the card.

## Phase 7: inside a project (decision 1)

- **The eight tracks of a stored project:** engine, sound name, level, sends.
- **Move sounds** between a project and the banks: a track's sound out into a bank, or a library
  sound onto a stored project's track. Assembling a project from the library is sound work, not
  sequencing.

## Phase 8: back up the whole FM1 (decision 3, parked)

Parked until Phases 1–3 have worked on the FM1 and decision 3 is revisited.

- **Save to a slot** (command 7) with the Workbench's sequence: write, read back and compare, save,
  load the slot, read back again. Asks first, naming the slot it replaces; slot 15 also holds the
  device settings, which the dialog says.
- **Back up every slot** in one action: read the working project, then load and read each named
  slot (command 8), then put the working project back. Every unsaved edit on the FM1 is at risk,
  so it asks first and refuses while the FM1 says its project is modified.
- **Restore** a set of projects to their slots, one confirmation naming every slot.

## Phase 9: microtuning (V13; decision 1)

M-VAVE added per-track tuning in V13 with no editor. Twelve cent offsets per track, a second table
for alternate notes, kept in the project's tuning block.

- A tuning editor per track: a keyboard of twelve cent offsets, the alternate table, presets
  (just intonation, meantone, maqam and raga scales), Scala `.scl` import.
- A tuning library beside the banks, and tunings sent as part of a project (kind 3).
- Needs a hardware run of a tuned project before anything ships, and approval of the kind 3 write.

## Phase 10: step editing (nice to have)

Last, and only once Phases 1–7 are in. The project's steps as Official Open models them, and
nothing a general sequencer adds (`AGENTS.md`, Sequencer scope).

- Per track: the step grid at its loop length (16, 32, 48, or 64), notes or drum parts, and each
  step's velocity, gate, probability, chord, and tie.
- Edits a project in the library, byte for byte, and reaches the FM1 by Phase 4's **Open project**.
- Needs its scope recorded in `AGENTS.md` first, and the step layout mapped in
  `docs/fm1-research.md` from the source and a hardware run.

## Separate track: the M-VAVE SMK-37 Pro

A 37-key controller with pads, encoders, and faders, and a DX7-style FM engine of its own. Community
ports of FM-1 firmware already run on it (X0X37, Makkuro37, and a kit for porting any FM-1
firmware), so the library and the DX7 catalog suit it, and Official Open may follow. Ben has one
arriving the week of 2026-10-19. Nothing below is known yet; every point waits for a hardware run,
recorded in `docs/fm1-research.md` and `docs/hardware-runs/` before code depends on it.

**First hardware run**, each message sent once with Ben's approval for that test, nothing stored on
the keyboard that cannot be lost (there is no backup of its sounds yet):

1. **Ports.** What its MIDI ports are called on macOS (and Linux or Windows if possible), and whether
   `resolveMidiPortSelection` picks them.
2. **Identity.** Its answer to `fm1IdentityQuery`, the one `00 32` message the editor may send:
   the reply's bytes and name, captured as a fixture. No other `00 32` or `00 59` message.
3. **What it plays.** A Note On and Off on each channel, to find the channel its engine listens on.
4. **Program Change.** Whether it selects a stored sound, and which bank layout that implies.
5. **DX7 parameter change.** One parameter on INIT VOICE: heard, and is it kept after a Program
   Change?
6. **DX7 single-voice dump.** To the edit buffer, or over a stored sound as FM-1+VA does? Test on a
   sound whose loss does not matter.
7. **32-voice bank dump.** Only if 6 shows dumps go to an edit buffer: does it replace a bank?
8. **Effect controllers.** The FM1's FX Channel CC 0–23, one at a time, on a channel the engine does
   not play.

**Then, in the editor:**

- **A device as well as a firmware.** `classifyFm1Firmware` and `resolveFirmwareProfile` gain the
  SMK-37's stock firmware as its own family, with only the capabilities the run proved; an FM-1
  firmware port on it keeps that firmware's family.
- **Names.** The badge, help, photos, and interface strings say "FM1" today. Where the device is
  meant, they follow the identified device, in every locale.
- **Out of scope:** its pads, sequencer patterns, chord and scale modes, and controller mappings,
  which are the keyboard's own, as the FM1's sequencer is.

## Out of scope

- The firmware installer, the `00 59` update family beyond the identity query, and the sample bank
  write (commands 12–14): **Dangerous / excluded**.
- The WebAssembly simulator.
- Sample editing; `.fm1s` files are kept in backups and files only.
- Banks of other sizes than 32, unless the fixed size proves a problem in use.

## Throughout

- **Bundle.** Every phase lazy: the reader, the writer, the engine editors, the project library, and
  the catalog load on first use; the entry gains only triggers and profile capabilities. Measure
  each with `npm run bundle:check` against the 167 KiB budget.
- **Profile.** Each new ability is a capability in `familyProfiles`' `official-open` entry, from the
  release it was tested on.
- **Locales.** Every string in all eight locales; engine names stay in English as printed on the FM1.
- **Hardware.** The orange FM1 runs Official Open. Each protocol step gets a captured run in
  `docs/hardware-runs/` and fixtures before its code ships.
- **Docs.** The user guide, help guide, and README follow each phase.

## Suggested order and size

| Phase | Depends on                    | Rough size | Value                                        |
| ----- | ----------------------------- | ---------- | -------------------------------------------- |
| 0     | nothing                       | small      | V13 correct, firmware guide                  |
| 1     | approval                      | medium     | Read voices and sounds off the FM1           |
| 2     | nothing (files), 1 (read)     | large      | The library holds every engine               |
| 3     | 1, 2, approval                | medium     | One click puts any library sound on a track  |
| 4     | decision 1, 1, approval       | medium     | Songs saved to and reopened from the browser |
| 5     | 2, 3, approval                | large      | Edits every engine better than the panel     |
| 6     | 2; decision 4 for factory set | large      | Thousands of sounds, easy to find            |
| 7     | 4                             | small      | Projects assembled from the library          |
| 8     | decision 3 (parked), 4        | medium     | Whole-device backup in one action            |
| 9     | decision 1, 4                 | medium     | The one feature M-VAVE does not offer        |
| 10    | decision 2, 7                 | large      | Steps edited off the FM1 (nice to have)      |

Phases 0 and 2's file half can start at once; 1 needs only its approval and a hardware run.
Categories (Phase 6) need nothing from the FM1 and help the DX7 library today, so they can start
whenever there is room.
