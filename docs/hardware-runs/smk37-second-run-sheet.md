# M-VAVE SMK-37 Pro: second run sheet

The procedure for the second run on Ben's SMK-37 Pro, drafted 2026-11-08. Nothing here has been
run. It follows [`smk37-2026-11-03.md`](smk37-2026-11-03.md) and asks the three questions that run
left open:

- **A. Can the editor read the selected preset back?** Then a patch could be received, edited,
  and kept in the library.
- **B. Can the editor choose which preset a dump replaces?** Then library slot A13 could go to
  the keyboard's A13.
- **C. What do stock V016 and SMK37 OPEN take?** Neither has run on an SMK-37 for this project.

Run the parts in order: A and B on V015, C1 after updating to V016, C2 after installing SMK37
OPEN, since SMK37 OPEN's recovery restores V016. When a part is run, copy this sheet to
`smk37-<date>.md`, fill in the results, and move each answer into `docs/fm1-research.md` with its
confidence.

## Rules for this run

- Every message is sent once, from `smk37-send.swift` beside this sheet, never from the editor,
  so each step sends exactly one kind of message. Run it as
  `swift docs/hardware-runs/smk37-send.swift <command>`. It prints what it sends and everything
  the keyboard sends back, and listens 1.5 s after each send.
- The tool sends standard channel messages, Yamaha `F0 43` SysEx, and two fixed requests:
  `identity` (the editor's `fm1IdentityQuery`) and `oo-info` (Official Open's command 0, info,
  approved 2026-10-16, which reads and changes nothing). Nothing else from the `00 32`, `00 59`, or
  `7D` families, and never `F0 35`, which the V015 firmware read lists as M-VAVE's own setting
  messages (**Dangerous / excluded**).
- Nothing in A, B, or C1 writes a preset. The only write is C2's step 5, on a DX7 track's unsaved
  voice, and it needs Ben's approval recorded under MIDI in `AGENTS.md` before it is sent.
- Updating to V016 and installing SMK37 OPEN use M-VAVE's own updater, outside the editor and
  this tool. Do not run the repair tool or any community installer during the run.

## Before starting

1. Write down the names of the keyboard's presets in its first bank: there is still no backup of
   them, and C1 and C2 may replace them. ______
2. Confirm the firmware on the screen is V015: ______
3. `swift docs/hardware-runs/smk37-send.swift ports`: copy the list. ______

## A. Reading a preset back (V015)

### A0. Static check, before sending anything

In the V015 disassembly used for "What V015's firmware shows" in `docs/fm1-research.md`, look for
a handler of the Yamaha dump request, `F0 43 2n ff F7`: a compare against `0x20` on the third
byte, or a call that builds `F0 43 00 00 01 1B` or `F0 43 00 09 20 00` for sending. Note the
function and whether anything calls it from the MIDI input path. ______

Run A1 and A2 either way: a request the firmware drops costs nothing, and the static reading can
miss a caller.

### A1. Single-voice dump request

Select a preset you can recognise on the keyboard: ______.

`swift docs/hardware-runs/smk37-send.swift sysex F0 43 20 00 F7`

| Anything printed as `in:`? | Size (a single voice is 163 bytes) | First bytes | Screen shows |
| -------------------------- | ---------------------------------- | ----------- | ------------ |
|                            |                                    |             |              |

If 163 bytes arrive, also send `sysex F0 43 21 00 F7` (channel 2) and `sysex F0 43 2F 00 F7`
(channel 16), to learn whether the request's channel matters.

### A2. Bank dump request

`swift docs/hardware-runs/smk37-send.swift sysex F0 43 20 09 F7`

| Anything printed as `in:`? | Size (a bank is 4104 bytes) | First bytes | Which bank? |
| -------------------------- | --------------------------- | ----------- | ----------- |
|                            |                             |             |             |

If a bank arrives, run `listen 10` beside a second request with another bank selected on the
keyboard, to learn which bank it sends. A bank received here is the first backup of the
keyboard's presets: save the printed bytes.

## B. Choosing the preset a dump replaces (V015)

The first run found Program Change on channel 1 ignored, and the firmware read found the DX7 core
drops it on every channel. These steps try what was left untried. Note the preset on the screen
before each: ______.

| Step | Send                              | Preset on screen after | Sound changed? |
| ---- | --------------------------------- | ---------------------- | -------------- |
| B1   | `cc 1 0 0`, `cc 1 32 0`, `pc 1 5` |                        |                |
| B2   | `cc 1 0 1`, `cc 1 32 0`, `pc 1 5` |                        |                |
| B3   | `pc 10 5`                         |                        |                |
| B4   | `pc 16 5`                         |                        |                |

B4 covers a keyboard that takes Program Change only on its Pad channel or another GLOBE setting:
note GLOBE's **Key Chn** and **Pad Chn** first, and if either is not 1, add a row with `pc` on
that channel. ______

If none changes the preset, the editor cannot choose one, and a write to the SMK-37 has to ask
the user to select the preset on the keyboard first.

## C1. Stock V016

Update the keyboard to V016 with M-VAVE's updater. Note whether the presets written down above
survived the update: ______. Whether the updater can put V015 back: ______.

1. `ports`: are the names the same as V015's? ______ (the port kit lists VID:PID B64B for V016,
   V015 had CF4D)
2. `identity`: copy the reply. Predicted `SMK-37 Pro_016`, which the editor calls the SMK-37's own
   firmware. ______
3. `pc 1 0`, `pc 1 5`: preset on screen after each. ______
4. `sysex F0 43 10 01 06 1F F7` (Algorithm 32) on a preset: heard? Gone after selecting another
   preset and back? ______
5. `sysex F0 43 20 00 F7` and `sysex F0 43 20 09 F7`, as A1 and A2. ______
6. Under a held `note 1 60 3000`, on channel 2: `cc 2 0 127`, `cc 2 1 0`, `cc 2 70 127`,
   `cc 2 71 0`. Anything heard? ______

Skip a single-voice dump on V016: the first run showed V015 stores one, and that alone would not
change what the editor does.

## C2. SMK37 OPEN

Install SMK37 OPEN (M-VAVE's `smk37_open`, V01 or later) with its own updater. Note the release:
______. It replaces the stock app's presets with a project; recovery restores the factory V016
package, not the presets written down above.

1. `ports`: copy the list. The USB port's name is not in the source. If there is no
   `SMK-37 Pro-Private`, set `SMK_PORT` to each listed destination in turn for step 2. ______
2. `identity`: copy the reply. Predicted `SMK-37 Pro_8000001`, which the editor does not
   recognise yet. Which port answered? ______
3. On the keyboard, set track 1 to DX7 if it is not.
4. `oo-info` on the port that answered step 2:

   | Reply bytes | Engines it lists for tracks 1–8 (decode later with `parseOfficialOpenInfoReply`) |
   | ----------- | -------------------------------------------------------------------------------- |
   |             |                                                                                  |

5. **Only with approval recorded first.** A single-voice dump on channel 1, the channel of
   track 1: `syxfile <a downloaded patch>`. Predicted: track 1 plays the patch as an unsaved
   edit, gone when the project is reloaded without saving. Heard? ______ Gone after reloading?
   ***
6. `sysex F0 43 10 01 06 1F F7`: predicted dropped, as on the FM1's Official Open. ______

## Going back

Restore V015 or V016 with M-VAVE's updater if Ben wants the stock app back after C2. Note which,
and whether the factory presets came back: ______

## What the results decide

- **A** decides whether the receive wizard can ask the SMK-37 for its preset (a new capability in
  the `smk37` profile, with the request approved under MIDI in `AGENTS.md` first) or whether the
  SMK-37 stays send-only. A bank reply would also give the first backup, which a bank write would
  need before it is considered.
- **B** decides how **Write to SMK-37…** chooses the preset: by Program Change, or by asking the
  user to select it on the keyboard. The write itself rests on the first run's confirmed result
  that a dump replaces the selected preset.
- **C1** decides whether V016 needs a profile entry of its own, or keeps V015's from release 0.
- **C2** decides how SMK37 OPEN is recognised: `SMK-37 Pro_8xxxxxx` read as the Official Open
  family on the SMK-37 device (`fm1Device` already reads the model). Each Official Open feature,
  sending a patch to a DX7 track and reading a track's voice or a bank, then needs its own run on
  the keyboard before the profile offers it there.
