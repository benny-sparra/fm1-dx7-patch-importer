# Virtual Analog editor hardware tests

**Prepared:** 2026-10-06, from Baud Girl's Device Manager code at release `FM-1_096`
**Execution status:** not run yet.
**Scope:** whether a Virtual Analog preset stores each row where `docs/fm1-research.md`, "Every
row of a Virtual Analog preset", says it does (**Likely**, from Baud Girl's code). The editor's
Virtual Analog page reads and writes those bytes, so it waits on this run.

The probe sends only the preset read `7D 10` and the sound-setting CCs 24–31, 52–57, and 70–78 on
the note channel. Every other change is made by hand on the FM1 and stored with SAVE. Nothing is
written to the FM1 by the editor.

## 0. Preparation

1. Back up the FM1 in Baud Girl's Device Manager with **Back up everything**, and keep the presets
   file. Close the Device Manager tab.
2. Pick a preset you can lose, such as 032. On the FM1, select it, press EDIT, choose **Erase
   Preset**, then **VA**, and press SAVE. It is now a new Virtual Analog preset.
3. Open the development build in Chrome, switch MIDI on, choose the FM1 as output and input, and
   open **FM-1+VA preset probe (dev)** from the footer.
4. Set the probe's preset to the one from step 2 and press **Read**. This first read is the
   baseline; it logs nothing.

## How each step runs

- **A CC step** (V1–V18): choose the setting under **Setting**, type the value, and press
  **Send**. Press SAVE on the FM1, then **Read** in the probe.
- **A by-hand step** (V19–V26): change the row on the FM1, type the change under **Changed by
  hand on the FM1** exactly as the step names it, and press **Note the change**. Press SAVE on the
  FM1, then **Read** in the probe.

The probe logs the bytes each step changed under **Byte map**. Don't change anything else between
steps. A step that changes no byte, or a byte the table does not expect, is worth a note.

## 1. Oscillator (V1–V4)

| Step | Setting     | Value | Expected change        |
| ---- | ----------- | ----: | ---------------------- |
| V1   | CC 27 Drift |   127 | record 22: `00` → `64` |
| V2   | CC 28 Sub   |   127 | record 45: `80` → `E4` |
| V3   | CC 29 Noise |   127 | record 46: `80` → `E4` |
| V4   | CC 30 PWM   |   127 | record 48: `80` → `E4` |

## 2. Filter (V5–V11)

| Step | Setting               | Value | Expected change        |
| ---- | --------------------- | ----: | ---------------------- |
| V5   | CC 52 Filter Envelope |   127 | record 25: `80` → `E4` |
| V6   | CC 53 Filter Decay    |   127 | record 51: `80` → `E4` |
| V7   | CC 54 Filter Shape    |   127 | record 49: `80` → `E4` |
| V8   | CC 55 Filter Velocity |   127 | record 47: `80` → `E4` |
| V9   | CC 57 LFO to Cutoff   |   127 | record 50: `80` → `E4` |
| V10  | CC 71 Resonance       |   127 | record 24: `80` → `E4` |
| V11  | CC 74 Cutoff          |     0 | record 23: `E4` → `80` |

## 3. LFO and Envelope (V12–V18)

Check the FM1's Envelope is Off before V15 (EDIT, **Envelope**). The manual says an Envelope CC
switches it On, which V15 checks.

| Step | Setting             | Value | Expected change                                    |
| ---- | ------------------- | ----: | -------------------------------------------------- |
| V12  | CC 76 LFO Speed     |   127 | voice 112 → `63`                                   |
| V13  | CC 77 LFO Pitch Mod |   127 | voice 114 → `63`                                   |
| V14  | CC 78 LFO Delay     |   127 | voice 113 → `63`                                   |
| V15  | CC 73 Attack        |   127 | record 54 → `64`, and record 53 gains bit 6 (`40`) |
| V16  | CC 75 Decay         |   127 | record 55 → `64`                                   |
| V17  | CC 70 Sustain       |   127 | record 56 → `64`                                   |
| V18  | CC 72 Release       |   127 | record 57 → `64`                                   |

## 4. Rows set by hand (V19–V26)

| Step | Change on the FM1        | Type in the probe      | Expected change                    |
| ---- | ------------------------ | ---------------------- | ---------------------------------- |
| V19  | **Level** to 50          | `V19 Level 50`         | voice 14 → `32`                    |
| V20  | **Velocity to Level** 7  | `V20 Velocity 7`       | voice 13: bits 2–4 → 7 (adds `1C`) |
| V21  | **Mono** On              | `V21 Mono On`          | record 58: `00` → `01`             |
| V22  | LFO **Wave** Sine        | `V22 LFO Wave Sine`    | voice 116: bits 1–3 → 4            |
| V23  | LFO **Amp Mod Depth** 50 | `V23 Amp Mod Depth 50` | voice 115 → `32`                   |
| V24  | LFO **Pitch Sens.** 7    | `V24 Pitch Sens 7`     | voice 116: bits 4–6 → 7            |
| V25  | LFO **Sync** On          | `V25 LFO Sync On`      | voice 116: bit 0 set               |
| V26  | **Envelope** Off         | `V26 Envelope Off`     | record 53: bit 6 (`40`) cleared    |

## 5. Finish

1. Press **Copy map** in the probe and paste the map into the conversation, or save it as
   `docs/hardware-runs/fm1-va-editor-map-<date>.json`.
2. Put the preset back with the Device Manager's **Put a backup back**, or leave it as a test
   preset.
