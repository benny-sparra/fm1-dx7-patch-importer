# Stock V16: follow-up to the Codex firmware reading

Date prepared: 2026-10-28. Device: the owner's orange FM1, stock `FM-1_016`.
**Status: proposed; no hardware tests performed.**

See [the dated firmware reading](../fm1-research.md#codex-firmware-reading-2026-10-28)
for addresses, confidence and parser boundaries. Static predictions below are **Likely**;
observable results are **Needs hardware test** until recorded. This sheet grants no new approval.
Any step labelled **needs the owner's approval first** stays deferred until that approval is
recorded under the repository's MIDI rules. No new sender accompanies this research.

## Before each test

1. Preserve valuable unsaved work using the existing owner-operated workflow before changing the
   test setup. Do not assume that the browser has a copy of the FM1's current edits or settings.
2. Confirm the existing approved identity query reports `FM-1_016`. Record the ports, firmware,
   date and test ID. Stop if the firmware differs.
3. Disable looping audition, ARP and SEQ unless the particular test needs them. Disconnect other
   MIDI senders and clock sources. Use low monitoring volume.
4. Photograph or transcribe all eight Voices' On/Off, preset, channel and level, the selected
   Voice, FX group number/name, Effect Ch, global volume and sync settings. Record relevant pan,
   bend and glide settings. This is the baseline, not a machine-readable setup backup.
5. Capture outgoing and incoming MIDI with timestamps and an audio recording where useful. Change
   one variable at a time, then compare with the preceding capture. Do not automatically replay
   unknown incoming messages.
6. Use the existing explicit Note Off panic if notes remain sounding. Stop on an unexpected
   identity, disconnect, persistent change or screen state. Do not retry by invoking a save,
   updater, loader or reset.

Do not press SAVE in these tests. Restore front-panel settings from the baseline afterwards.
A power-cycle test is optional only after the owner has preserved all unsaved work; document it
separately, since it deliberately discards unsaved state. No test deliberately damages storage.

## A. Does a single-voice dump affect every Voice sharing its preset?

Uses existing approved notes, Note Off and the stock single-voice dump. Make Voice selection and
setup changes on the FM1 itself. Do not use the excluded Voice-2 vendor message.

1. On the front panel, enable Voice 1 on channel 1 and Voice 2 on channel 2. Assign both the same
   disposable test preset. Select Voice 1 on the FM1. Keep other Voices Off for this comparison.
   Record each setup change separately.
2. Play and release the same note at the same velocity on each channel in turn. Capture the two
   baseline sounds. Set the editor's note channel before each audition and log any automatic sends.
3. Send one valid DX7 single-voice dump with a recognisably different sound through the existing
   approved path. Check the MIDI log contains exactly that dump and no intervening Program Change
   or other edit. A slot click that changes the preset is not a valid isolated test.
4. Play new notes on channels 1 and 2 separately. Prediction: both use the edited sound although
   only Voice 1 was selected. Check the displayed preset, channels, levels and On/Off did not change.
5. Restore the baseline sound using the same approved dump path. Change only Voice 2's preset on
   the front panel to a different preset. Repeat the dump and note comparison. Prediction:
   Voice 2 now retains its own sound. This is the control for a global audio/FX change.
6. Restore the shared-preset setup, select Voice 2 manually, and repeat once. Repeat with another
   distinguishable valid voice to rule out an inaudible edit. Keep the FX group fixed throughout.

Record fresh-note and already-held-note observations separately; the static refresh loop does not
establish how an already sounding note changes. A failure is not permission to manipulate the
FX-library flag or stored item 5. The predicted edit is in RAM; this test does not verify Flash
persistence.

## B. Distinguish global volume, expression and Voice level

**Needs the owner's approval first:** sending CC 7, CC 11 and CC 121 for this experiment is not
an existing stock-editor operation authorised by the current repository rules. A decoded branch
is not approval. Do not use a generic vendor-command console.

1. After approval, prepare two enabled Voices on separate channels and record their displayed
   levels and the global volume. Keep their sounds, FX and note velocity fixed.
2. Send CC 7 value 64 on channel 1 once. Play a new note on each channel separately. Record
   global volume, both Voice levels and loudness. Prediction: global volume changes; the
   Voice-page levels do not. Restore global volume manually before the next trial.
3. Send CC 11 value 32 on channel 1 once, then compare both channels. Prediction: expression
   affects the matching Voice, without editing its stored level. Send CC 11 value 127 on
   channel 1 to restore it, and repeat with value 64.
4. Send CC 11 value 32 on channel 1, release all notes, then send CC 121 value 0 on channel 1.
   Play a new note. Prediction: expression returns to its default 127. This does not prove a
   reset of modulation, sustain or every controller; record only what was tested.
5. Restore the baseline, repeat once after reconnecting the same ports, and record whether the
   effect depends on the selected Voice or just the channel. Preserve unsaved work before any
   optional power cycle; do not save to test persistence.

CC 120/123 are not needed for this run. Keep the existing explicit Note Off panic.

## C. Bounded readback of the selected Voice and live effects

**Needs the owner's approval first:** stock object-4 and object-5 vendor reads are excluded under
the current rules. Before a future run, review and approve a bounded read implementation with
response matching, exact length checks, timeout and cancellation. Do not run a downloaded tool
merely because its README calls it a reader.

1. After approval, read only object 4 offset 0, length 176, and object 5 offset 0, length 215.
   Capture exact requests/replies and decoded bytes, alongside the baseline screen state.
2. Change only the selected Voice on the front panel; read again. Repeat for three Voices with
   different known presets/channels. Check object 4 offsets `02`, `05`, `07`, `08`, `87`, `88`
   against preset, channel, bend up/down, glide time and glide On respectively.
3. Select the original Voice again. Change only its channel manually, read, restore, then repeat
   separately for bend and glide values. Expected: selected fields change; there is no tagged
   eight-Voice snapshot or explicit selected index in the mapped fields.
4. Change one live FX value with an already approved effect controller; read again. Check object
   5's values at `9C..B6` and table at `B7..D1`. Preserve the final five bytes `D2..D6` as opaque
   data in captures; do not label them as unused or zero them.
5. Select another FX group manually, record its visible number/name and read again. Compare the
   mapped arrays. Do not infer a group ID or name from a coincidental byte match in a single pair.
   Restore the group and repeat for a third group.

No write is part of this test. Do not use offsets at or above `10000000`, stored-item/raw reads,
object 8, command `15`, transfer command `30`, or any loader/update path. A timeout ends the
attempt; it is not a reason to probe different command IDs.

## D. FX order while preserving effect-indexed settings

**Needs the owner's approval first:** object-4 writes remain excluded. Defer this experiment until
a separately reviewed bounded operation and its approval exist; the existing draft PR is not
permission to send it.

1. After approval, choose a disposable FX group manually and note its number/name. Read a fresh
   object-4 baseline as in C. Keep the front panel and all other FX senders idle throughout.
2. Change only the order bytes of entries 0–5 at offset `92`, preserving a permutation of IDs
   0–5. Preserve every On/Off and Type byte and all bytes in entries 6–8. Never move whole triples.
3. Send only the approved bounded update, then read the block again immediately. Confirm the
   requested order, all effect-indexed On/Off/Type values, the group and selected Voice fields.
4. Restore the original order from a fresh read and verify again. Repeat with a second ordering.

Do not deliberately race a front-panel group change against the write: no expected-group guard
was found, so a stale update can affect the wrong group. The read/write sequence is not atomic.
No SAVE or persistence test is included.

## E. Clock, Start and Continue

**Needs the owner's approval first:** this proposed clock/transport sender is not an approved
editor feature. Do not send these messages during the other experiments.

1. After approval, select a known disposable sequence on the front panel, with recording Off.
   Record the selected Voice/pattern and local tempo. Set SEQ external sync manually.
2. Use one clock source at 120 BPM (24 `F8` ticks per quarter note). Observe the tempo display
   before starting playback. Capture timestamps; do not assume the host's timer is exact.
3. Send Start (`FA`), observe the first step and selected Voice, then Stop (`FC`) after a known
   step. Release notes with the existing panic if necessary.
4. Send Continue (`FB`) at the same clock rate and observe the first step. Prediction from the
   shared request branch: no distinct saved-position behaviour is established. Record whether
   it restarts or resumes, rather than treating the static branch as a measured result.
5. Stop; change only clock tempo to 90 BPM and repeat. Restore sync and all baseline settings.
   A second simultaneous clock source and Song Position Pointer are outside this first run.

## Recording and acceptance

For each test retain the before/after screen state, exact MIDI capture, input/output ports,
firmware identity, timestamps, audio when relevant, observed result and restoration steps.
Record failures and unrelated traffic as well as successes. Repeat one-variable comparisons over
several values before upgrading confidence. Add captured fixtures and deterministic codec tests
only when an approved operation is implemented; no fixtures are fabricated by this sheet.

None of the proposed observations licenses automatic Voice setup, a raw-memory workaround,
loader traffic, persistent bank writes, or a save to open the single-dump gate.
