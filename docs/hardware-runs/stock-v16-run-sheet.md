# M-VAVE V16: run sheet

The procedure for the first run of the editor with M-VAVE's stock V16 (`FM-1_016`), which answers
the questions in `docs/fm1-research.md`, "M-VAVE's V16 stock firmware". Nothing has been run yet.
When it is, copy this sheet to `stock-v16-<date>.md` beside it, fill in the results, and move each
answer into the research notes with its confidence.

Every message sent here is one the editor already sends to stock firmware, apart from step 4's
controllers, which the development FX probe sends only in its **V16 research** mode. Nothing here
touches the updater, the loader, or Flash beyond what the FM1 itself does on SAVE or a bank import.
Never send `F0 22 24 36 …`, the new M-VAVE command the firmware takes, or the soft key
`F0 22 24 35 7D F7`, which V16 still answers by rebooting into its loader.

Each step says what the firmware predicts (research notes, "What the firmware shows", 2026-10-23).
Record what happens either way: a result that differs is the finding.

## Before flashing

1. Choose the FM1. The green one runs Baud Girl's firmware (FM-1+VA) and the orange one Official
   Open; either has to go back to its own firmware afterwards. Write down which: ______
2. Back up what it holds:
   - Green: Baud Girl's Device Manager, **“Back up everything”**, and keep the file.
   - Orange: save each project slot you want to keep; Official Open's projects do not survive a
     stock firmware.
3. Flash `FM-1_016.fwsc` with M-VAVE's M-UPGRADE tool (M-VAVE downloads, PC Firmware).
4. On the FM1, open the last GLOBE page and check it shows V16: ______

## Setting up

1. Quit anything else using the FM1's MIDI.
2. Start the dev server (`npm run dev`) and open the editor in Chrome. Switch **MIDI online**, and
   choose the FM1 as both **Output** and **Input monitor** in **Settings**.
3. On the FM1, note **Effect Ch** (stock default 2): ______. Set the editor's **FX channel** to
   match. Keep the editor's **Note channel** on 1, different from Effect Ch, so CC 7, CC 11, and
   notes 0–26 on Effect Ch cannot be mistaken for anything else.
4. On the FM1, open PRESETS and select each Voice in turn. Note its MIDI Ch, On/Off, and preset:

   | Voice | MIDI Ch | On/Off | Preset |
   | ----- | ------- | ------ | ------ |
   | 1     |         |        |        |
   | 2     |         |        |        |
   | 3–8   |         |        |        |

5. Open **MIDI log** in the editor and keep it open: every send below is recorded there. Copy the
   log into the results when each step finishes.

## 1. Identity

1. Switch **MIDI online** off and on again.
2. Record what the header badge says, and the text under **FM1 firmware** in **Settings**. Expected:
   **M-VAVE V16**, "Patches you play go to the FM1’s edit buffer.", and "The effect controls send
   nothing yet, as V16 moved them to other controllers." The firmware holds the string `FM-1_016`,
   but its reply path was not traced, so a missing reply is possible.

| Badge | Settings text | Identity reply bytes (from the MIDI log) |
| ----- | ------------- | ---------------------------------------- |
|       |               |                                          |

## 2. The editor sends no effects

1. Click a slot in bank A, then open a patch in the editor and move every effect control.
2. In the MIDI log, check no Control Change went out on the FX channel. Record any that did.

Result: ______

## 3. The old controllers, CC 0–23

1. Open **FX probe (dev)** in the footer and choose **V16 research**.
2. Hold a note on the FM1, and on its FX page watch the current FX group.
3. Send each of CC 0–23 at 0, then 127, then the value the FX page showed before. Note anything that
   changes: an effect, the sound, the volume. CC 1, 2, and 4 are sound modulation on V16 by its
   notes, but only on a Voice's channel, so on Effect Ch they should do nothing unless a Voice
   listens there. Firmware: none of CC 0–23 reaches the effects.

| CC   | What changed at 0 | What changed at 127 |
| ---- | ----------------- | ------------------- |
| 0–23 |                   |                     |

## 4. The new controllers, CC 70–93

For each controller, with the matching effect's page showing on the FM1 and a note held, send each
of the probe's suggested values (0, 1, 63, 64, 126, 127) and note which parameter moves and what
the FM1 shows. Then send the value it showed first, so the FX group is left as it was.

Firmware: each group of four is the editor's own effect parameters in order, with V15's limits,
and a larger value is clamped rather than scaled:

- The first of each group turns its effect on at any value but 0, so 1, 63, and 127 all show on.
- 71 and 75, the Filter and Reverb types, show the last type (High Pass, Plate) from 2 up.
- 72, Filter Cutoff, shows 107 from 107 up; 73, Q, shows 10 from 10 up.
- Every other parameter shows 100 from 100 up, so 126 and 127 both show 100.
- The FM1's FX page jumps to the effect each controller changes.

| CC  | Effect     | Parameter that moved | Shown at 0 | at 1 | at 63 | at 64 | at 126 | at 127 |
| --- | ---------- | -------------------- | ---------- | ---- | ----- | ----- | ------ | ------ |
| 70  | Filter     |                      |            |      |       |       |        |        |
| 71  | Filter     |                      |            |      |       |       |        |        |
| 72  | Filter     |                      |            |      |       |       |        |        |
| 73  | Filter     |                      |            |      |       |       |        |        |
| 74  | Reverb     |                      |            |      |       |       |        |        |
| 75  | Reverb     |                      |            |      |       |       |        |        |
| 76  | Reverb     |                      |            |      |       |       |        |        |
| 77  | Reverb     |                      |            |      |       |       |        |        |
| 78  | Delay      |                      |            |      |       |       |        |        |
| 79  | Delay      |                      |            |      |       |       |        |        |
| 80  | Delay      |                      |            |      |       |       |        |        |
| 81  | Delay      |                      |            |      |       |       |        |        |
| 82  | Distortion |                      |            |      |       |       |        |        |
| 83  | Distortion |                      |            |      |       |       |        |        |
| 84  | Distortion |                      |            |      |       |       |        |        |
| 85  | Distortion |                      |            |      |       |       |        |        |
| 86  | Chorus     |                      |            |      |       |       |        |        |
| 87  | Chorus     |                      |            |      |       |       |        |        |
| 88  | Chorus     |                      |            |      |       |       |        |        |
| 89  | Chorus     |                      |            |      |       |       |        |        |
| 90  | Phaser     |                      |            |      |       |       |        |        |
| 91  | Phaser     |                      |            |      |       |       |        |        |
| 92  | Phaser     |                      |            |      |       |       |        |        |
| 93  | Phaser     |                      |            |      |       |       |        |        |

Then:

1. Does SAVE now offer **Globe**, as an unsaved FX change? ______
2. Switch the FM1 off and on without saving. Is the FX group as it was before the step? ______
3. Do the six effects' order and On/Off states match the editor's six Enabled switches, or does a
   group's first controller do something else? ______
4. Set the FM1's **Effect Ch** to 1, the Voices' channel, and send CC 72 at 0 and back. Firmware:
   the Filter still follows, and the Voices hear nothing else. Result: ______ Set Effect Ch back.
5. Send CC 94 and 95 at 1. Firmware: nothing changes, since the range check stops them. ______

## 5. Where a patch lands with eight Voices

Use two Voices on different channels: Voice 1 on channel 1 and Voice 2 on channel 3, both On, each
on a different preset you can tell apart by ear. Turn the other Voices off.

Firmware:

- A Program Change loads its program into every Voice that is On on its channel or on All.
- A dump and the parameter changes edit the preset loaded on the Voice selected on the FM1's
  screen, whatever channel they come on. Every Voice playing that preset hears the edit.
- The edit is unsaved and lives in RAM until SAVE.
- A dump is applied only while a flag the analysis could not trace is set. If no dump is ever
  heard, say what the FM1 shows.

1. Select Voice 1 on the FM1's screen. Editor **Note channel** 1: click a slot in bank A (Program
   Change, then the voice as a dump). Which Voice changes preset, and which plays the library's
   sound? ______
2. Open that patch in the editor and wait for its back button to be enabled. Move one operator
   level (one parameter change). Which Voice hears it? ______
3. Editor **Note channel** 3: repeat 1 and 2. Which Voice? Firmware: the Program Change reaches
   Voice 2, but the dump and the edit still reach Voice 1's preset, the one on screen. ______
4. Select Voice 2 on the FM1's screen and repeat 3. Does the dump now reach Voice 2? ______
5. Put Voice 2 on channel 1 too, so both layer. Repeat 1 and 2. One Voice or both? Firmware: the
   Program Change gives both the same preset, so both hear the dump. ______
6. After step 1, does SAVE offer **Preset**, as an unsaved edit of that Voice's preset? Select
   another preset on that Voice and back: is the library's sound gone? Firmware: no, it stays,
   because the edit is kept in RAM until the FM1 is switched off. ______
7. Play the editor's on-screen **Keyboard** on each note channel. Which Voice sounds? ______

## 6. Sending a bank

1. Fill an editor bank with patches you can recognise, and press **Send to FM1**.
2. Record what the FM1 shows when the bank arrives, word for word, and how a destination is
   chosen: ______
3. Choose a bank, confirm, and check one preset sounds like the library's.
4. Press **Send to FM1** again and cancel on the FM1. Is anything written? ______

## 7. Bank Export

Firmware:

- Export offers banks A–D. It sends one message of 4104 bytes, `F0 43 0n 09 20 00`, the bank's
  4096 bytes, a checksum, and `F7`, over USB-MIDI only.
- The FM1 shows **Connect USB** without a USB host and **USB Busy** while a transfer runs.
- The analysis reads bytes 4–5 as `20 00` through a paired instruction, so check them.
- `n` should be the FM1's MIDI channel minus one, or 0 for All. GLOBE MIDI Ch: ______

Capture what the FM1 sends, with nothing else listening:

1. Close the editor's tab. Open `https://127.0.0.1:5174/firmware/` from the dev server, which has
   no MIDI code of its own.
2. In its console (allow MIDI and SysEx when asked), paste the snippet below. It sends nothing:
   it records every message from the FM1 for 60 seconds, then downloads them as a JSON file.
3. While it records, start Bank Export on the FM1 for a bank you can recognise.
4. Move the downloaded `stock-v16-bank-export-<date>.json` beside this sheet.

```js
{
  const access = await navigator.requestMIDIAccess({ sysex: true })
  const input = [...access.inputs.values()].find((port) => /fm.?1|usb composite/i.test(port.name))
  if (!input)
    throw new Error(`No FM1 input. Inputs: ${[...access.inputs.values()].map((p) => p.name)}`)
  console.log('Recording from', input.name, 'for 60 s. Start Bank Export on the FM1 now.')
  const start = performance.now()
  const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const messages = []
  const hear = (event) =>
    messages.push({
      at: Math.round(performance.now() - start),
      bytes: event.data.length,
      hex: hex(event.data),
    })
  input.addEventListener('midimessage', hear)
  await new Promise((resolve) => setTimeout(resolve, 60_000))
  input.removeEventListener('midimessage', hear)
  console.log(messages.length, 'messages recorded')
  const file = new Blob([JSON.stringify({ input: input.name, messages }, null, 2)], {
    type: 'application/json',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = `stock-v16-bank-export-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
}
```

| Messages | Total bytes | First bytes of each                                  | Time from first to last | Notes |
| -------- | ----------- | ---------------------------------------------------- | ----------------------- | ----- |
|          |             | (`F0 43 0n 09 20 00` is a Yamaha 32-voice bulk dump) |                         |       |

Then, back in the editor, open **Receive patch…** and run Bank Export again. Does it take anything,
or say what it heard? Firmware: a bank is one 32-voice dump, which the dialog does not take. ______

Last, with the USB cable out and the FM1 on its battery, start Bank Export. Does it say **Connect
USB**? ______

## 8. Going back

1. Flash the FM1's own firmware again: Baud Girl's through her installer, or Official Open through
   M-VAVE's.
2. Restore the backup from "Before flashing", and check one preset or project.

## What the results decide

- Step 4 gives the V16 controller map. If the six groups line up with the editor's 24 effect
  parameters, as the firmware predicts, V16 gets `effectControllers` back through a range of its
  own in the firmware profile and its controllers at CC 70–93, the editor's numbers plus 70, with
  tests from this run's values.
- Each answer that matches the firmware moves from **Likely** to **Confirmed** in the research
  notes; one that differs replaces the firmware's reading there.
- Step 4's SAVE and power-cycle answers decide whether a patch's effects may be sent at all, since
  on V16 they change the shared FX group every Voice hears.
- Step 5 decides whether the editor must say which Voice it edits, and whether a slot click
  should still send a Program Change.
- Step 6 rewords the bank destination instructions for V16.
- Step 7 decides whether a bank receiver is possible without any new message sent.
