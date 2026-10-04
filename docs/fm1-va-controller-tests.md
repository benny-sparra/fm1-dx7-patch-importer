# FM-1+VA controller tests

**Prepared:** 2026-10-01, from the FM-1+VA manual at release `FM-1_093`
**Execution status:** run once on `FM-1_093`, 2026-10-04, with the repeat run of §9, by
`scripts/run-fm1-va-controller-tests.sh`; ledger
[`docs/hardware-runs/fm1-va-controller-2026-10-04-2131.md`](hardware-runs/fm1-va-controller-2026-10-04-2131.md),
results in `docs/fm1-research.md`, "Controllers on the MIDI Channel". V5 is still open: the
Envelope was already On when CC 73 was sent, so run `--from V5` again from an erased preset.
**Scope:** whether the Control Changes FM-1+VA reads on its MIDI Channel set a Virtual Analog
preset's settings as its manual says (`docs/fm1-research.md`, "Controllers on the MIDI Channel"),
and how each CC value maps to the value the FM1 shows. The answers decide whether a live Virtual
Analog editor (`docs/feature-backlog.md`, FM-1+VA item 6, "Play them live") can be built, and how
its controls scale.

This plan sends only the sound-setting CCs 24–31, 52–57, and 70–78, through
`scripts/send-fm1-va-sound-cc.c`, which refuses every other controller.
`scripts/run-fm1-va-controller-tests.sh` walks through the whole plan, sends each CC itself, and
writes the answers to a ledger in `docs/hardware-runs/`; `--from V5` resumes at one test. It never sends CC 85–119,
which FM-1+VA reads as its own knobs and buttons, and it sends no SysEx apart from what the editor
already sends in V7. No CC writes the FM1's memory: SAVE has no CC. V7 alone presses SAVE once,
to store a Virtual Analog preset over the test preset, and §10 puts the test preset back.

## 0. Preparation

1. Check the FM1's firmware under **About** at the end of the GLOBE screen, and record the version
   in the ledger (§9). Run on `FM-1_093` or later, or record the differences the manual notes for
   earlier releases.
2. On the FM-1+VA Presets page, press **Save a backup** and keep the `.syx` file. Close the tab
   afterwards, so it does not hold the FM1's MIDI port.
3. Keep GLOBE at its defaults: **MIDI Channel** All, **FX Channel** 2, **Ext Ctrl CC7 Vol** On.
4. Pick the **test preset**: 097 (bank D, slot 1) unless the Virtual Analog preset pack occupies
   it. Select it, open EDIT, choose **Erase Preset**, confirm, and choose **VA**. Do not press
   SAVE: the erased preset is an unsaved edit, and a preset change discards it. Every test below
   starts from this state unless it says otherwise; to return to it, step PRESETS away and back
   and erase again.
5. Build the sender and find the FM1's destination:

   ```bash
   clang -o /tmp/send-va scripts/send-fm1-va-sound-cc.c -framework CoreMIDI -framework CoreFoundation
   ```

   ```bash
   /tmp/send-va list
   ```

   On macOS the FM1 is listed as `USB Composite Device`. Use its number as `<dest>` below, and
   channel 1. Close the editor and any other MIDI app first.

6. Keep a note playing from the FM1's own keys, or hold a key, while you send each value, so a
   change on a held note can be heard.

## 1. Defaults of a new Virtual Analog preset (V1)

Straight after the erase in §0, before sending anything, step through the EDIT screen and record
every row's value: Waveform, Super, Detune, Drift, Sub, Noise, PWM, the Filter group (Type, Cutoff,
Resonance, Envelope, Decay, Shape, Velocity, Key Tracking, LFO to Cutoff), Level, Mono, the LFO
group, and the Envelope group with its switch. **New Virtual Analog preset** in the editor starts
from these values.

## 2. Each CC reaches its row (V2)

For each CC in the table of `docs/fm1-research.md`, "Controllers on the MIDI Channel", Virtual
Analog column, send 0, 64, and 127:

```bash
/tmp/send-va <dest> 1 25 0
```

After each send, record the row the FM1's screen names, the value it shows, whether the dot
follows the preset's name on HOME, and whether a held note changes at once. Send CC 70, 72, 73,
and 75 last, because the first of them switches the Envelope on (V5).

## 3. List settings (V3)

For Waveform (CC 24), Filter Type (CC 31), and Filter Key Tracking (CC 56), send each value at
the edges of the expected equal bands, 31, 32, 63, 64, 95, and 96, and record the choice shown.
Record Waveform's choice by the name on screen, not by ear.

## 4. Continuous scaling (V4)

For Super (CC 25), Filter Decay (CC 53), and Cutoff (CC 74), send 0, 1, 2, 32, 63, 64, 65, 96,
126, and 127, and record the value shown. Cutoff shows hertz; record it as shown. This establishes
the mapping and its rounding for one setting of each kind; if all three fit one rule, the others
are assumed to follow it until a test says otherwise.

## 5. The Envelope switch (V5)

1. Erase the test preset to Virtual Analog again (§0, step 4). Press ENV, or open the Envelope
   group, and record that Envelope is Off.
2. Send `73 64` (Attack). Record whether Envelope is now On and Attack shows the new value.
3. Step PRESETS away and back without SAVE. Record that the Envelope switch returned to the
   stored preset's own setting.

## 6. Channels and preset kinds (V6)

1. Send `25 127` on channel 2, the FX Channel. Record that nothing changes: the FM1 ignores CCs
   above 23 there.
2. Set GLOBE **MIDI Channel** to 1. Send `25 0` on channel 3 and record that nothing changes, then
   on channel 1 and record that it does. Set MIDI Channel back to All.
3. Select an FM preset. Send `24 127`, `31 127`, and `57 127`, and record that nothing changes and
   no dot appears. Then send `74 0` (Brightness) and record what it does. Step PRESETS away and
   back to discard it.

## 7. The editor's patch over a Virtual Analog preset (V7)

From `FM-1_087`, a DX7 patch arriving over a Virtual Analog preset turns it into an FM preset. The
editor sends a patch to FM-1+VA as its 155 parameter changes; this test finds out what those do
to a stored Virtual Analog preset. Run it after every other test and the repeat runs (§9), because it writes the test preset.

1. Erase the test preset to Virtual Analog (§0, step 4), change Waveform to Square with `24 127`
   so the preset is easy to recognise, and press **SAVE**. The test preset is now a stored Virtual
   Analog preset. Step PRESETS away and back and record that it still plays as one.
2. Open the editor, check that **Settings** names FM-1+VA, and click a patch under **Other DX7
   patch banks** in the search once. Wait until the MIDI log shows it sent as parameter changes.
3. Record whether the FM1 now plays the DX7 patch, whether EDIT shows an FM or a Virtual Analog
   preset, and whether the dot shows.
4. Step PRESETS away and back without SAVE. Record whether the stored Virtual Analog preset is
   back, or whether the test preset is now an FM preset.
5. Close the editor, then put the test preset back (§10).

## 8. Fast changes (V8)

The editor's sliders send a value for each step of a drag. Hold a note and run:

```bash
for value in $(seq 0 127) $(seq 127 -1 0); do /tmp/send-va <dest> 1 74 "$value"; done
```

Record any crackle, stuck note, or freeze, and whether the screen ends on the last value sent
(0). Repeat with Super (CC 25).

## 9. Repeatability

Switch the FM1 off and on, erase the test preset to Virtual Analog again, and repeat V2 for CC 24,
25, 31, and 74, and V3 for CC 24. A result counts as **Confirmed** in `docs/fm1-research.md` only
when both runs agree.

## 10. Clean-up

Step PRESETS away from the test preset. If V7 ran, or any preset was saved by mistake, use **Put
a backup back** on the FM-1+VA Presets page with the §0 file, which rewrites only the presets that
differ from it. Check that GLOBE's MIDI Channel is All again.

## 11. Ledger

Record the date, FM-1+VA version, computer, and USB for every run, and copy each line the sender
prints (`to_fm1 B0 19 7F`) beside its result.

| Test | Run 1 result                                                        | Run 2 result            | Bytes sent    | Notes                         |
| ---- | ------------------------------------------------------------------- | ----------------------- | ------------- | ----------------------------- |
| V1   | Recorded; Waveform Saw and Envelope Off rechecked                   | —                       | none          | Filter Shape not read clearly |
| V2   | Every CC reached its row, with the dot                              | CC 24, 25, 31, 74 agree | in ledger     | Sustain at 127 not read       |
| V3   | Four equal bands for CC 24, 31, 56                                  | CC 24 agrees            | in ledger     | CC 24 = 31 not read           |
| V4   | `round(value × 100 ÷ 127)`; Cutoff `20 × 1000^(step ÷ 100)` Hz      | —                       | in ledger     |                               |
| V5   | Envelope already On, so not shown                                   | —                       | `B0 49 40`    | Run again                     |
| V6   | FX Channel and other channels ignored; FM preset ignores 24, 31, 57 | —                       | in ledger     | CC 74 sets Brightness         |
| V7   | Parameter changes are an unsaved edit; stored VA preset came back   | —                       | none          |                               |
| V8   | No crackle, stuck note, or freeze                                   | —                       | 256 per sweep |                               |

## 12. What follows from the results

- Record each result in `docs/fm1-research.md`, "Controllers on the MIDI Channel", and raise it to
  **Confirmed** only after two runs agree.
- V2 to V4 settle the CC table and its scaling. If they agree with the manual, a live Virtual
  Analog editor can send these CCs, gated on FM-1+VA `FM-1_086` or later, as bounded operations
  in `src/lib/` that accept only these controller numbers.
- V5 decides whether the editor warns that Envelope controls switch the Envelope on.
- V7 decides whether the editor must stop, or warn before, sending a patch while a Virtual Analog
  preset may be selected. If the parameter changes store an FM preset over it, that is as unsafe
  as the single-voice dumps were, and comes first.
- V8 decides whether drags need to be thinned before they are sent.
- The editor still cannot show a preset's current values or save one. Those wait for FM-1+VA
  items 2 and 4 in `docs/feature-backlog.md`.
