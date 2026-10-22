# M-VAVE V16: run sheet

The procedure for the first run of the editor with M-VAVE's stock V16 (`FM-1_016`), which answers
the questions in `docs/fm1-research.md`, "M-VAVE's V16 stock firmware". Nothing has been run yet.
When it is, copy this sheet to `stock-v16-<date>.md` beside it, fill in the results, and move each
answer into the research notes with its confidence.

Every message sent here is one the editor already sends to stock firmware, apart from step 4's
controllers, which the development FX probe sends only in its **V16 research** mode. Nothing here
touches the updater, the loader, or Flash beyond what the FM1 itself does on SAVE or a bank import.

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
   nothing yet, as V16 moved them to other controllers."

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
   listens there.

| CC   | What changed at 0 | What changed at 127 |
| ---- | ----------------- | ------------------- |
| 0–23 |                   |                     |

## 4. The new controllers, CC 70–93

For each controller, with the matching effect's page showing on the FM1 and a note held, send each
of the probe's suggested values (0, 1, 63, 64, 126, 127) and note which parameter moves and what
the FM1 shows. Then send the value it showed first, so the FX group is left as it was.

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

## 5. Where a patch lands with eight Voices

Use two Voices on different channels: Voice 1 on channel 1 and Voice 2 on channel 3, both On, each
on a different preset you can tell apart by ear. Turn the other Voices off.

1. Editor **Note channel** 1: click a slot in bank A (Program Change, then the voice as a dump).
   Which Voice changes preset, and which plays the library's sound? ______
2. Open that patch in the editor and wait for its back button to be enabled. Move one operator
   level (one parameter change). Which Voice hears it? ______
3. Editor **Note channel** 3: repeat 1 and 2. Which Voice? ______
4. Put Voice 2 on channel 1 too, so both layer. Repeat 1 and 2. One Voice or both? ______
5. After step 1, does SAVE offer **Preset**, as an unsaved edit of that Voice's preset? Select
   another preset on that Voice and back: is the library's sound gone? ______
6. Play the editor's on-screen **Keyboard** on each note channel. Which Voice sounds? ______

## 6. Sending a bank

1. Fill an editor bank with patches you can recognise, and press **Send to FM1**.
2. Record what the FM1 shows when the bank arrives, word for word, and how a destination is
   chosen: ______
3. Choose a bank, confirm, and check one preset sounds like the library's.
4. Press **Send to FM1** again and cancel on the FM1. Is anything written? ______

## 7. Bank Export

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
or say what it heard? ______

## 8. Going back

1. Flash the FM1's own firmware again: Baud Girl's through her installer, or Official Open through
   M-VAVE's.
2. Restore the backup from "Before flashing", and check one preset or project.

## What the results decide

- Step 4 gives the V16 controller map. If the six groups line up with the editor's 24 effect
  parameters, V16 gets `effectControllers` back through a range of its own in the firmware profile
  and a V16 controller table, with tests from this run's values.
- Step 4's SAVE and power-cycle answers decide whether a patch's effects may be sent at all, since
  on V16 they change the shared FX group every Voice hears.
- Step 5 decides whether the editor must say which Voice it edits, and whether a slot click
  should still send a Program Change.
- Step 6 rewords the bank destination instructions for V16.
- Step 7 decides whether a bank receiver is possible without any new message sent.
