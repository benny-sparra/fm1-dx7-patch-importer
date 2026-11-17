# Official Open Phase 1: read what the FM1 holds

Drafted 2026-11-05; Ben made the decisions at the end the same day. Nothing here is built yet. It
expands Phase 1 of [the Official Open plan](official-open-plan.md) into work that starts after the
hardware run. The protocol is in [the research notes](fm1-research.md#official-open-v14-read-2026-10-20);
the hardware run is [its own run sheet](hardware-runs/official-open-phase1-run-sheet.md).

## Where it stands

| Piece                                               | State                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approval of commands 1 (kinds 1, 2, 4), 2, 6, 9, 22 | **Done** 2026-10-20, in `AGENTS.md`. Kinds 0 and 3 (projects) are not approved and Phase 1 does not need them.                                                                                                                                                                                                                                                               |
| Codec and reader, `src/lib/official-open-read.ts`   | **Done** (#317): builders for 1, 2, 6, 9, 22; `readOfficialOpenExport` (64-byte chunks, three tries a second apart, size check, command 6 at the end); `readOfficialOpenCapabilities`; `readOfficialOpenSlotName` (empty slot → null); CRC-32.                                                                                                                               |
| Codec tests, `official-open-read.test.ts`           | **Done**: synthetic replies, refusals, retries, abort.                                                                                                                                                                                                                                                                                                                       |
| Hardware run of every read                          | **Done on V14, orange FM1** (2026-10-20, `hardware-runs/official-open-v14-reads-2026-10-20.md`, capture JSON beside it). 808 and PLUCK sounds were not read, and nobody checked the screen stayed unchanged.                                                                                                                                                                 |
| Command 0 and the DX7 track send                    | **Done**: `official-open-track-send.ts`, lazy from `useMidi`, one queue turn for read and dump.                                                                                                                                                                                                                                                                              |
| Anything that calls the reader                      | **Hook done** (2026-11-09): `src/hooks/use-official-open-reader.ts`, one queue turn per read, tested against the V14 capture. The receive wizard's reading screen calls it (2026-11-17), on Official Open and SMK37 OPEN. Before that: **Missing.** No hook, UI, or production module imports `official-open-read.ts`; only its test and the run sheet's console snippet do. |
| Turning the bytes into library voices               | **Done** (2026-11-09): `src/lib/official-open-library-read.ts`. Before that: **Missing.** Kind 1's first 155 bytes are a DX7 edit buffer (`packDx7Voice` converts it); kind 4 is 32 packed voices with no SysEx frame, which `parseDx7Bank` will not take as it is.                                                                                                          |
| A profile capability for the reads                  | **Done** (2026-11-09): `trackVoiceRead` and `libraryBankRead`. Before that: **Missing.** `official-open` lists only `bankDumps`, `singleVoiceDumps`, `trackEngineRead`.                                                                                                                                                                                                      |
| A run on the green FM1                              | **Missing.** The orange FM1 now runs stock V16; the green one runs Official Open since 2026-11-03, on a build not yet recorded.                                                                                                                                                                                                                                              |

Two smaller gaps: `official-open-track-send.ts` keeps its own copy of the request loop and error
class (`readOfficialOpenInfo`), and its token counter lives in that module, so a read and a send
would each count tokens on their own. Phase 1 moves the counter and the `OfficialOpenLink` built
from WebMidi ports into one small lazy module both use; merging the two request loops is optional.

## What the user can do when it is done

On an FM1 running Official Open:

1. **Read a track's DX7 voice into a slot.** Pick a track (only DX7 tracks can be chosen; the
   others show their engine), hear it on review, put it in a slot. Replacing a patch offers Undo.
   This is the reverse of today's send, and the FM1's unsaved edits come with it (to be confirmed
   by the run).
2. **Read a bank of the FM1's DX7 library** (V14 and later) into a bank of the library: review
   its 32 voices, then replace a bank (Undo) or fill an empty one, exactly as **Import DX7 bank**
   does. "All four banks" is a choice on the same screen and adds four new banks.

A track running another engine (303, 808, PSG, PLUCK, SAMPLER) shows its engine and cannot be
chosen (decision 2): the library cannot hold its sound until Phase 2 adds the `openTrack` map, and
Phase 2 reads those sounds straight into the library. The run still reads every engine's sound
(kind 2), as research for Phase 2.

Nothing in Phase 1 changes the FM1. Project reads (kind 0/3) and slot names wait for Phase 4,
which can store them; command 9 is in the run only to record how it behaves on this FM1.

## Entry points

**One wizard, the existing Receive patches** (decision 1), so every way in that users already know
works on Official Open too.

- **Receive from the FM1…** (a bank's ⋮ and Library actions) and **Receive over MIDI…** (a slot's
  **Import patch…**) open `ReceiveFromFm1Dialog` as today. While the profile has the new read
  capability, its source screen offers **A track's voice** and **A bank of the FM1's library** in
  place of "Send from the FM1"; the listen screen becomes a
  **Reading…** screen with a barber pole, the track or bank chooser, and Cancel. Review and
  destination are the wizard's own, unchanged. From a slot, only the single-voice path shows.
- `AGENTS.md` today says the wizard "sends nothing"; on Official Open it would send the approved
  reads, so that rule changes with this work.
- A separate **Read from the FM1…** wizard was the alternative, set aside for one more menu item
  and a second wizard ending the same way.

No track strip yet: Phase 3 grows it from the track status, and a per-track Read can go on it then.

## Modules and bundle boundaries

| Module                                        | Loaded                                     | Holds                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/firmware-profile.ts` (entry)         | eager                                      | Two capabilities: `trackVoiceRead` (kind 1, release 0, as V12 had it) and `libraryBankRead` (kind 4, release 14). An unnumbered build (`FM1_COMMUNITY_n`, `FM1_OFFICIAL_OPEN`) gets only `trackVoiceRead`. |
| `src/hooks/use-midi.ts` (entry)               | eager                                      | Expose the existing queue turn (`queueEffectOrder`, generalised to a named-group turn) so a lazy hook can hold one turn for a whole read. No read code here.                                               |
| `src/lib/official-open-link.ts` (new)         | lazy, shared by track send and reads       | The token counter, and the `OfficialOpenLink` over a WebMidi input and output with logging and the activity LED.                                                                                           |
| `src/lib/official-open-library-read.ts` (new) | lazy, with the wizard                      | `readTrackVoice` (kind 1 → `Dx7Voice` via `packDx7Voice`), `readLibraryBank` (kind 4 → 32 `Dx7Voice`, 7-bit checked).                                                                                      |
| `src/hooks/use-official-open-reader.ts` (new) | lazy, with the wizard                      | Takes a `MidiController` slice as `useFm1VaPresetReader` does; one queue turn per read; aborted when either port changes, MIDI goes off, or the wizard unmounts.                                           |
| `ReceiveFromFm1Dialog` and its strings        | already lazy, `en-GB-librarian-dialogs.ts` | The Official Open source and reading screens.                                                                                                                                                              |

The entry should grow only by the two capabilities and the exposed queue turn, tens of bytes.
Measure with `npm run bundle:check` before and after, and compare the initial chunk list with
`main`'s, since a lazy chunk sharing new modules with the entry can move Rolldown's cuts.

**MIDI log.** A bank read is 66 messages; logging each chunk buries the rest, as the audition
phrase would. Log the begin request with its bytes, one line when the read finishes ("Read bank 1
from the FM1: 4096 bytes in 64 chunks"), and any refusal or retry; the chunks themselves are quiet.

**Converting.** Kind 1 byte 155, the operator on/off mask, has no place in the library (mute and
solo are the editor's, never the patch's), so it is dropped and an FM1 track with operators switched
off reads back with all six on. The library's normaliser runs on every voice read, as on every
other path in. A kind 1 read of a track that is not DX7 is refused by the FM1 (to confirm);
the wizard never asks, since command 0 has said which tracks are DX7.

## Hardware run

[`hardware-runs/official-open-phase1-run-sheet.md`](hardware-runs/official-open-phase1-run-sheet.md),
on the green FM1, with every byte each step sends. It repeats the V14 reads on this FM1 and its
build, and answers what the first run did not: 808 and PLUCK sounds, whether a read sees unsaved
edits, the library bank order against the screen, reading while the sequencer plays, and what the
FM1 does with an abandoned transfer, which decides how the reader recovers after a reload
mid-read. A second, short run checks the finished wizard before it ships.

## Open questions

1. **Which build the green FM1 runs.** `4c7496da` still reports `FM-1_8000014`; the transfer
   protocol is unchanged in it, so either is fine, but the run records it.
2. **An abandoned transfer.** Does a new command 1 while another export is open answer busy,
   replace it, or wait for the 10 s timeout? Run step 7.
3. **Unsaved edits.** Does kind 1 return the track's current sound, edits included? Run step 4.
   If not, the wizard has to say "as last saved".
4. **Library bank order.** Kind 4 bank 1, voice 1 is program 1 on the screen? Run step 5.
5. **Playback.** Does a 64-chunk Flash read stutter the sequencer? If it does, the wizard says to
   stop playback first. Run step 6.
6. **SMK37 OPEN** runs the same transfer code. Since 2026-11-17 it is identified as Official Open
   on the SMK-37 and offered both reads (the owner asked for it as soon as possible); its run
   checks them with the rest of `docs/smk37-open-research.md`.

None blocks writing the code against synthetic fixtures; 2–5 decide wording and recovery, so the
run should come before the UI is final.

## Approvals still needed in `AGENTS.md`

- No new protocol: every message is one approved on 2026-10-20.
- The receive wizard's "sends nothing" rule: on Official Open it sends the approved reads.
- The new profile capabilities and their releases, written into the Official Open paragraph.
- Bundle boundaries: the Official Open reads in the receive wizard's chunk.

## Tests and fixtures

- **Fixtures** from the green FM1's capture, in `src/lib/`: one kind 1 voice, one kind 2 sound per
  engine (all six once the run reads 808 and PLUCK), one kind 4 bank. The V14 capture already gives
  DRY CLAV, a 303, a SAMPLER, PSG, and four banks.
- `official-open-library-read.test.ts`: kind 1 → the voice the FM1 names, byte for byte against
  `packDx7Voice`; kind 4 → 32 voices, PIANO 1 first; a byte above 7 bits, a short read, and a wrong
  engine byte are refused with typed errors. The kind 2 fixtures wait for Phase 2's tests.
- `use-official-open-reader.test.ts` with a fake link and deferred replies: one queue turn per
  read; a port change mid-bank stops at the next chunk and sends no cancel; unmount aborts; a
  second click while reading starts nothing; tokens never repeat across a read and a send.
- `firmware-profile.test.ts`: each capability at V12, V13, V14, and an unnumbered build.
- `receive-from-fm1-dialog.test.tsx`: Official Open sources shown only with the capability;
  non-DX7 tracks disabled with their engine named; reading, cancel, failure as translated text;
  replace and Undo; StrictMode open guard; a German or Ukrainian render of "Track {{track}}".
- `src/i18n/resources.test.ts` covers the new keys in all eight locales, with Ukrainian plurals.
- `e2e/fake-midi.ts` answers commands 1, 2, and 6 from the fixtures, and a Playwright journey reads
  a library bank into an empty bank and checks the bytes it recorded.

## Order of work

1. The run (no code needed: the console snippet uses the existing reader), and its results in
   `docs/fm1-research.md`.
2. Fixtures, `official-open-link.ts`, `official-open-library-read.ts`, the profile capabilities.
3. The reader hook and the wizard's Official Open screens; strings in every locale.
4. Bundle check, `npm run check`, the e2e journey, docs (user guide, help, README).
5. The acceptance run in the editor; then one PR to `main`.

## Decisions (Ben, 2026-11-05)

1. **Entry point:** extend **Receive from the FM1…**, not a separate **Read from the FM1…** wizard.
2. **A track's sound before Phase 2:** left out. Phase 1 reads DX7 track voices and library banks
   only; no `.fm1t` download.
3. **All four library banks at once:** Ben had no preference, so it is offered, adding four new
   banks.
4. **The hardware run** goes ahead before the UI is built.

## Decisions (Ben, 2026-11-09)

Asked again while looking at how to keep the library and the FM1 in step on every firmware.

1. **Entry point:** unchanged, the Receive wizard. A separate four-bank compare dialog was
   considered and set aside: the wizard's review screen already marks what differs, and a
   side-by-side of four banks would suggest the library's A–D mirror the FM1's, which they do not
   on Official Open.
2. **All four library banks at once** changes from decision 3 above: rather than always adding
   four new banks, the review screen shows each FM1 bank's count of patches that differ from a
   destination bank Ben picks for it, as a single bank's does.
3. **The hardware run** still comes before the wizard's screens. The profile capabilities, the
   shared link and token counter (`src/lib/official-open-link.ts`), the conversion, and the reader
   hook were written first, against the V14 capture, on `feature/official-open-library-read`.
4. It is one-way, FM1 to library, and is not called a sync: a library bank write is a Flash write
   and stays excluded.
