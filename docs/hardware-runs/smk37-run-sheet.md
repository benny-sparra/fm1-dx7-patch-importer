# M-VAVE SMK-37 Pro: run sheet

The procedure for the first run of the editor with an SMK-37 Pro on its stock firmware. It answers
the checklist in `docs/official-open-plan.md`, "Separate track: the M-VAVE SMK-37 Pro". Nothing
has been run yet. When it is, copy this sheet to `smk37-<date>.md` beside it, fill in the results,
and move each answer into `docs/fm1-research.md` with its confidence.

Every message sent here is a standard MIDI or Yamaha DX7 message the editor already sends to an
unidentified FM1, plus the identity query and the FX probe's controllers. Nothing touches the
updater, the loader, or Flash beyond what the keyboard does itself on SAVE or a bank import. Do not
run M-UPGRADE, the repair tool, or any community installer during this run, and never send the
soft key `F0 22 24 35 7D F7`.

Each step says what the port kit predicts (plan, "Known before the run"). Record what happens
either way: a result that differs is the finding.

## Before starting

1. Which model and version: the box and back panel say **SMK-37 Pro / Elite / MKE-P37**: ______.
   The keyboard's settings show firmware ______ (013 shows as 1.10). Leave it on what it shipped
   with; whether to update to V016 is decided after step 2.
2. Find the keyboard's MIDI settings and note them: MIDI channel ______, any effect or FX
   channel ______, anything like the FM1's GLOBE Export ______.
3. Back up its sounds before step 6 changes any. If the keyboard can export a bank (step 7), do
   step 7 first for every bank and keep the files. If it cannot, write down the names of the presets
   step 6 will use, and accept that step 6 may lose one.

## Setting up

1. Quit anything else using the keyboard's MIDI.
2. Start the dev server (`npm run dev`) and open the editor in Chrome. Switch **MIDI online**.
3. Open **MIDI log** and keep it open: every send below is recorded there. Copy the log into the
   results when each step finishes.
4. Keep the editor's **Note channel** on 1 and its **FX channel** on 2 unless step 3 shows the
   keyboard listens elsewhere.

## 1. Ports

Predicted: macOS lists `SMK-37 Pro Midi` (or similar); the editor does not prefer it, since it
prefers only FM-1 names, so it may pick nothing or another port.

| Outputs listed (Settings) | Inputs listed | Port the editor chose by itself |
| ------------------------- | ------------- | ------------------------------- |
|                           |               |                                 |

Choose the keyboard as **Output** and **Input monitor**.

## 2. Identity

1. Switch **MIDI online** off and on again.
2. Record the badge and the text under **FM1 firmware** in **Settings**, and copy the 41-byte reply
   from the MIDI log.

Predicted: the reply reads `SMK-37 Pro_016` (or `_013`, `_015`), and the badge says the firmware
is unidentified, so the editor sends patches as 155 parameter changes.

| Badge | Settings text | Identity reply bytes |
| ----- | ------------- | -------------------- |
|       |               |                      |

## 3. What it plays

Open **Keyboard** and play a few notes with the header's **Ch** set to each channel in turn.

| Channels that play | Does the screen show a part or channel? | Notes |
| ------------------ | --------------------------------------- | ----- |
|                    |                                         |       |

Set **Ch** to a channel that plays for the rest of the run.

## 4. Program Change

Click slots A01, A02, A32, then B01 and D32. The editor sends each slot's Program Change, then the
voice as parameter changes. Watch the keyboard's screen: the preset number can only come from the
Program Change.

| Slot | Preset the keyboard shows | Sounds like the library's patch? |
| ---- | ------------------------- | -------------------------------- |
| A01  |                           |                                  |
| A02  |                           |                                  |
| A32  |                           |                                  |
| B01  |                           |                                  |
| D32  |                           |                                  |

How many banks and presets the keyboard holds, from its own screen: ______

## 5. DX7 parameter change

1. Put INIT VOICE in a library slot, click it, then open it in the editor and wait for it to be live
   (its back button is enabled).
2. Change **Algorithm** once, and one operator's **Coarse** once. Each goes as one parameter change.
3. Heard? ______ Does the screen show the change? ______
4. On the keyboard, choose another preset and come back. Is the edit still there? ______
5. Power-cycle without saving. Is it still there? ______

Kept after step 4 or 5 would mean parameter changes write a stored preset, not an edit buffer.

## 6. DX7 single-voice dump

The editor sends no dump to an unidentified firmware, so this step sends one by hand.

1. On the keyboard, select a preset whose loss does not matter: ______.
2. In the editor, **Download patch** on a library patch you can recognise.
3. Close the editor's tab. Open `https://127.0.0.1:5174/firmware/`, which has no MIDI code, and
   paste the snippet below in its console. It checks the file is one 163-byte DX7 single-voice dump
   and sends it once.

```js
{
  const access = await navigator.requestMIDIAccess({ sysex: true })
  const output = [...access.outputs.values()].find((port) => /smk/i.test(port.name))
  if (!output) throw new Error(`No SMK output: ${[...access.outputs.values()].map((p) => p.name)}`)
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.syx' })
  input.click()
  await new Promise((resolve) => input.addEventListener('change', resolve, { once: true }))
  const bytes = new Uint8Array(await input.files[0].arrayBuffer())
  const header = [0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b]
  if (
    bytes.length !== 163 ||
    header.some((b, i) => i !== 2 && bytes[i] !== b) ||
    bytes[162] !== 0xf7
  )
    throw new Error('Not one DX7 single-voice dump')
  output.send(bytes)
  console.log('Sent', bytes.length, 'bytes to', output.name)
}
```

4. Does the keyboard play the patch? ______ What does the screen show? ______
5. Choose another preset and come back. Still the patch? ______
6. Power-cycle. Still the patch? ______

Kept after 5 means a dump writes the stored preset, as on FM-1+VA: then the editor must never
send one there, and step 8 is skipped.

## 7. Bank export

Only if "Before starting" found an export. In the editor, open a bank's ⋮ menu, **Receive from
the FM1…**, follow it to its listening screen, then start the export on the keyboard.

| Received? | Message size (from the log; a DX7 bank is 4104 bytes) | First bytes | Notes |
| --------- | ----------------------------------------------------- | ----------- | ----- |
|           |                                                       |             |       |

Save each received bank as a library bank and **Download** it: that is the backup.

## 8. Sending a bank

Only if step 6 left stored presets alone, and only with step 7's backup of the bank it may replace.

1. Fill an editor bank with recognisable patches and press **Send to FM1**.
2. What does the keyboard show, word for word, and how is a destination chosen? ______
3. Choose a bank, confirm, and check one preset sounds like the library's. ______

## 9. Effect controllers

1. Open **FX probe (dev)** in the footer. In its default mode it sends CC 0–23 on the FX channel.
2. Send CC 0 (Filter switch) at 127, then CC 1 (Cutoff) at 0, 64, and 107, holding a note.
3. Switch to **V16 research** and repeat at CC 70 and 71.

| Controller | Value    | Heard? | Screen shows |
| ---------- | -------- | ------ | ------------ |
| 0          | 127      |        |              |
| 1          | 0/64/107 |        |              |
| 70         | 127      |        |              |
| 71         | 0/64/107 |        |              |

If either range moves the effects, try the rest of that range one controller at a time, as the V16
run did, and note what each moves.

## Going back

Load step 7's backup banks back onto the keyboard if anything was replaced, and check one preset.

## What the results decide

- Steps 1 and 2 decide how the editor knows it is an SMK: the port name, the identity's model, or
  both. With `SMK-37 Pro_0xx` in the reply, `classifyFm1Firmware` gains an SMK stock family and the
  device comes from the text before the underscore.
- Steps 4–6 decide the SMK's profile: `programChanges`, and whether patches go as dumps
  (`singleVoiceDumps`) or parameter changes, and whether either touches stored presets.
- Step 7 decides whether **Receive from the FM1…** works for it unchanged, and step 8 rewords the
  bank destination instructions.
- Step 9 decides `effectControllers` and `effectControllerBase`.
- Whether to update it to V016 for a second run, so the port kit's reading of v016 can be checked.
