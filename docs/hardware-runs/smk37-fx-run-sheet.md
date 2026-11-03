# M-VAVE SMK-37 Pro: FX run sheet

The procedure for finding how MIDI reaches the SMK-37 Pro's FX page on its stock V015 firmware
(`SMK-37 Pro_015`). It follows the first run (`smk37-2026-11-03.md`), where CC 0–1 and CC 70–71
on channel 2 did nothing audible. What the public sources say, and what is guessed, is in
`docs/fm1-research.md`, "SMK-37 Pro FX page". Nothing has been run yet. When it is, copy this
sheet to `smk37-fx-<date>.md` beside it, fill in the results, and move each answer into
`docs/fm1-research.md` with its confidence.

Every message sent here is a standard channel message (Note On/Off or Control Change) from
`smk37-send.swift` beside this file. No SysEx of any kind is sent: no `00 32`, no `00 59`, no DX7
dump, and no identity query. Do not run M-UPGRADE, MIDI Suite's firmware tools, or any community
installer during this run. Do not press SAVE unless a step says so; none does.

**Run 2026-11-03 and V015's firmware:** the knobs send nothing, the FM1's V15 controllers do
nothing, and the firmware takes no Control Change for the FX page on any channel
(`smk37-fx-2026-11-03.md`; `docs/fm1-research.md`, "What V015's firmware shows"). Keep this sheet
for a later SMK firmware, whose release notes would have to mention effect control first.

Each step changes one thing. Record what happens either way: a result that differs from the
prediction is the finding.

## What the sources predict

- The FX page has four effect knobs and one setting: **Cut Off** (K1, the low-pass filter's
  cutoff), **Distortion**, **Reverb**, and **Delay** (K2–K4, each that effect's dry/wet mix), and
  **Latch** (K5). The manual says the FX values can be saved in a preset.
- **Latch is not an effect.** On, it keeps the FX page on screen after its button is released.
  M-VAVE's notes for V012 and V015 add that with Latch off, the knobs send standard MIDI
  messages. So with Latch off the knobs may send CCs out once the page is released; with it on
  they probably edit the synth and may send nothing.
- Nothing public says which CCs, if any, the SMK receives for these four. The FM1's V15 map
  would put them at CC 2 (Cutoff), CC 13 or 15 (Distortion Gain or Level), CC 7 (Reverb Mix), and
  CC 11 (Delay Mix), each behind its switch (CC 0, 12, 4, 8). The first run tried only CC 0 and 1,
  the Filter's switch and type, so the cutoff itself has not been tried.

## Before starting

1. Firmware on the keyboard's last settings page: ______ (expect 1.10 / V015). Stop if it is not
   V015: the sheet is for that release.
2. Note the GLOBE page's channel settings. The manual's picture shows `Chn-1` and `Chn-10`; write
   down what each one is called and set to: ______. Note any FX, effect, or control channel
   setting: ______. Do not change them yet.
3. Choose a bright, sustained preset that is not `SMK TEST` (a sine hides the filter): ______.
   Open FX on it and write down the five values: Cut Off ___ Distortion ___ Reverb ___ Delay ___
   Latch ___. These are the values to put back at the end.
4. Quit anything else using the keyboard's MIDI. Build the sender once:
   `swiftc docs/hardware-runs/smk37-send.swift -o /tmp/smk37-send`.

In the commands, a held note is `/tmp/smk37-send note 1 60 8000` in one terminal (eight seconds
of middle C on channel 1); the CC goes from a second terminal while it sounds.

## 1. Listen to the knobs (sends nothing)

1. In one terminal: `/tmp/smk37-send listen 300`. It prints everything the SMK sends on the ports
   whose names hold `SMK` (`Private` and `Master`; `Port 3` is not heard).
2. With **Latch On**, open FX. Turn K1 one detent right, then one left. Then K2, K3, K4 the same.
3. Press K5 (or turn it) to set **Latch Off**. Record what K5 itself sent.
4. Hold the FX button and turn K1–K4 one detent each, as in 2.
5. Release FX, so the page goes. Turn K1–K8 one detent each.
6. Set Latch back to On.

| Step | Knob | Latch | Page shown? | Bytes received (`in:`) | Screen value change |
| ---- | ---- | ----- | ----------- | ---------------------- | ------------------- |
| 2    | K1   | On    | yes         |                        |                     |
| 2    | K2   | On    | yes         |                        |                     |
| 2    | K3   | On    | yes         |                        |                     |
| 2    | K4   | On    | yes         |                        |                     |
| 3    | K5   | →Off  | yes         |                        |                     |
| 4    | K1   | Off   | held        |                        |                     |
| 4    | K2   | Off   | held        |                        |                     |
| 4    | K3   | Off   | held        |                        |                     |
| 4    | K4   | Off   | held        |                        |                     |
| 5    | K1–8 | Off   | no          |                        |                     |

A CC that arrives in step 2 or 4 is the best candidate for step 3 below. A CC that arrives only in
step 5 is the knob's controller assignment (MIDI Suite's), which says nothing yet about what the
synth receives.

## 2. The FX page from the panel

Turn each of K1–K4 on the FX page through its range under a held key, one at a time, and put it
back.

| Knob | Range shown | Heard | Kept after another preset and back? |
| ---- | ----------- | ----- | ----------------------------------- |
| K1   |             |       |                                     |
| K2   |             |       |                                     |
| K3   |             |       |                                     |
| K4   |             |       |                                     |

Kept after a preset change would mean the FX page edits a live setting shared by every preset,
as on FM1 V16; returned to the preset's value means each preset holds its own, as on V15.

## 3. Send back what the knobs sent

Only if step 1 recorded a CC in step 2 or 4. Send each such CC once, on the channel it arrived on,
under a held note, at 0, then 64, then 127, then the value the preset had. This replays a
standard Control Change by hand, one value at a time; never loop or script a replay.

| CC  | Channel | Value | Heard? | FX page value |
| --- | ------- | ----- | ------ | ------------- |
|     |         | 0     |        |               |
|     |         | 64    |        |               |
|     |         | 127   |        |               |

## 4. The FM1's V15 effect controllers

Under a held note, send each line once with `/tmp/smk37-send cc <channel> <cc> <value>`, first
on **channel 2**, then **channel 1**, then on each channel "Before starting" found (for example
10). Watch the FX page while sending (Latch On, page open). A switch is sent before its setting;
put each switch back to 0 after its rows. Values stay inside the FM1's ranges (`fm1-research.md`
§7.4).

| Order | CC  | Values     | FM1 meaning               | Ch 2 | Ch 1 | Ch ___ |
| ----- | --- | ---------- | ------------------------- | ---- | ---- | ------ |
| 1     | 0   | 1          | Filter on                 |      |      |        |
| 2     | 1   | 0          | Filter type low-pass      |      |      |        |
| 3     | 2   | 0, 53, 107 | Filter cutoff             |      |      |        |
| 4     | 12  | 1          | Distortion on             |      |      |        |
| 5     | 13  | 0, 50, 100 | Distortion gain           |      |      |        |
| 6     | 15  | 0, 50, 100 | Distortion level          |      |      |        |
| 7     | 4   | 1          | Reverb on                 |      |      |        |
| 8     | 7   | 0, 50, 100 | Reverb mix (or volume)    |      |      |        |
| 9     | 8   | 1          | Delay on                  |      |      |        |
| 10    | 11  | 0, 50, 100 | Delay mix (or expression) |      |      |        |

CC 7 and 11 are volume and expression on many synths: a level change on every note is that,
not the effect. Write it down either way.

If one of these moves an effect, try the other rows of that effect (`fm1-research.md` §7.4) on
the same channel, one controller at a time.

## 5. The same at V16's positions

M-VAVE moved the FM1's effects to CC 70–93 in its own V16. The SMK's V015 predates that, so this
is a long shot, but the first run tried only CC 70 and 71. Repeat step 4 with 70 added to each CC
(70, 71, 72, 82, 83, 85, 74, 77, 78, 81), on the channel that step 4 found, or on channels 2 and
1 if it found none.

## 6. General MIDI's effect controllers

Under a held note, on channel 1, then channel 2, one at a time at 0, 64, and 127, then back to
the preset's value:

| CC  | Usual meaning        | Ch 1 | Ch 2 |
| --- | -------------------- | ---- | ---- |
| 74  | Brightness (cutoff)  |      |      |
| 71  | Resonance            |      |      |
| 91  | Reverb send          |      |      |
| 93  | Chorus send          |      |      |
| 94  | Delay (celeste) send |      |      |

Apart from CC 85 in step 5 (V16's Distortion Level), CC 85–119 are left out: on FM-1+VA and
the FM1 several of them set its knobs or press its panel controls.

## 7. Sweep what is left

Only if steps 3–6 found nothing. On channels 1 and 2, under a held note, send each remaining CC
from 0 to 23 and from 70 to 93 once at 0 and once at its FM1 maximum (1 for a switch, 2 for a
type, 107 for CC 2 or 72, 10 for CC 3 or 73, 100 otherwise), then back to 0. One controller at a
time; stop and write down anything heard or shown.

## 8. Does it stay?

For every controller that moved an effect:

1. Choose another preset and come back. Still changed? ______
2. Power-cycle without SAVE. Still changed? ______

## Going back

Put the FX page back to the five values from "Before starting", and any GLOBE setting that
changed.

## What the results decide

- Step 1 says whether the FX knobs send CCs out, and with which Latch setting.
- Steps 3–7 decide whether the SMK's profile gets `effectControllers`, at what
  `effectControllerBase`, on which channel, and whether its four FX knobs are a few of the FM1's
  24 controllers or controllers of their own, which would need a new effect map rather than the
  editor's 24-parameter panel.
- Step 2 and step 8 decide whether the editor treats SMK effects as part of a patch (sent with a
  slot click, as on V15) or as a shared live setting (as on V16, `presetEffects` left out).
- If nothing moves the effects, the profile stays as PR 444 has it: no effects sent, and the
  effects panel hidden.
