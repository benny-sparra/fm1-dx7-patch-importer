# Other FM1 and DX7 editors: ideas for the editor

Reviewed 2026-10-11 against six web editors and librarians as served that day, and against
[`feature-backlog.md`](feature-backlog.md) and
[Baud Girl's Device Manager review](baud-girl-device-manager-review.md). Each was read from its
page, its JavaScript, and its README where it has one; none was connected to MIDI. Nothing here is
planned yet. An idea moves into the backlog when it is chosen, and the rules in
[Keeping the options down](baud-girl-device-manager-review.md#keeping-the-options-down) apply to
every one.

## The editors

| Editor                                                                                 | Targets                                   | In short                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DX7II Librarian](https://bladesk.github.io/DX7II-Librarian/) (blade.sk)               | DX7II, DX7s, DX7                          | Cartridge manager in floating windows, several open at once. Rename, reorder, send, request, and export; no voice editor. Kept in `localStorage`.                                                                         |
| [RK002 KFM patch extractor](https://www.retrokits.com/rk002/settings/kfm/patches.html) | Volca FM with RetroKits' firmware, DX7    | A 2016 page: load one 32-voice bank, click a name to send it as a single-voice dump.                                                                                                                                      |
| [DXWire](https://alexferl.github.io/dxwire/) (Alex Ferl)                               | DX7, TX7, Volca FM                        | Full parameter editor with explicit saves to a slot, banks chosen from two dropdowns, `.syx` and `.json` export. No audio.                                                                                                |
| [DX7 AI Patch Creator](https://dx7-patch-creator.pages.dev/) (Toon Beerten)            | The FM1, tested on it only                | Edits patches through an AI chat, with no manual editor. Plays patches in the browser with Dexed's engine in WebAssembly. Banks of any size, sent 32 at a time. Links `dx7-to-fm1.dev` as "the FM1 editor and librarian". |
| [FM-1 Utility](https://fm1-utility.pages.dev/) (unnamed)                               | Stock FM1                                 | Editor, effects, A–D banks held in memory only, a MIDI monitor, and a 64-step sequencer that records into the FM1's own by playing notes into it.                                                                         |
| [DXcompanion](https://dxcompanion.uk/) (Marian Fujara)                                 | reface DX, DX7, DX11, the FM1, and others | Profiles per synth; the FM1's is the DX7's without readback. Dexed's engine in JavaScript for audio, drag-edited envelopes, a user library with tags and favourites, ten themes, and a long keyboard shortcut list.       |

None of them identifies the firmware, knows FM-1+VA's preset commands, or holds Virtual Analog or
8-Bit presets. None has undo across the library or a second language. Four of them confirm and
report errors with `window.alert`, `confirm`, or `prompt`, which `AGENTS.md` rules out.

## Ideas

### 1. Warn when the note and FX channels are the same

DXcompanion shows a ⚠ when the effect channel equals the note channel. The FM1 reads CC 0–23 on the
FX channel as its effects, so on a shared channel a keyboard's mod wheel, CC 1, changes the Filter
type. Settings here lets both channels be the same without a word. A `WarningNotice` under the two
channel fields would explain it. No protocol; one string in every locale.

### 2. Restore one parameter, or one section

DXcompanion restores a single slider to the voice as loaded when it is double-clicked, and gives
each section a **Restore** button. Here **Compare with saved** and reverting cover the whole voice
only. Double-click is the cheaper half: it adds no visible control, which suits the rule against
more buttons, and one restore is one undo step. A rotary control already takes drags and keys, so
check that a double-click cannot also start a gesture.

### 3. More keyboard reach in the editor

DXcompanion nudges the last parameter touched with ↑ and ↓ from anywhere on the page, and steps
through patches with ← and →. The editor's shortcuts cover undo, redo, save, and back, and a
focused control already takes arrow keys. Stepping to the next or previous patch in the bank, with
the unsaved-changes prompt, is the one that saves real effort when auditioning. Any new shortcut
goes through `src/lib/keyboard-shortcuts.ts`, the help dialog, and `docs/user-guide.md`.

### 4. Follow what the FM1 sends

FM-1 Utility and DXcompanion listen to the FM1's output: the on-screen keys light for notes played
on the device, and a Program Change moves the selection to that preset. Here input is read only by
the preset read and write. Listening sends nothing, but what the FM1 sends when a preset is chosen
on its panel is not in [`fm1-research.md`](fm1-research.md), so a capture comes first. Lighting the
keyboard for incoming notes needs no protocol beyond Note On and Off.

### 5. Select several patches

DX7 AI Patch Creator selects with Shift- and Cmd-click, or a **Select** toggle on touch screens,
and offers **Move to…**, **Copy to…**, and **Delete** on the selection. On touch it gives up
dragging, and press-and-hold auditions a patch instead. This fits the touch work in `e2e/mobile/`,
but it is a large change to the patch grid's selection model and to **Copy to…**, so it is decided
on its own.

### 6. Insert as well as replace when dropping

The DX7II Librarian gives each row two drop zones: the gap above it inserts the dragged voice
there, and the row itself replaces it. Here a drag within a bank reorders and a drop on a bank tab
copies. Insertion in a full 32-slot bank would push the last patch out, which needs its own answer
before this is worth more thought.

### 7. Recognise the FM1's port by USB id

FM-1 Utility scores a port named with `4c4a` or `c755` as the FM1, beside `fm-1` and `m-vave`.
These look like USB vendor and product ids, which some systems put in a port's name. Confirm the
ids on the hardware and find a system that names a port with them before adding either to
`resolveMidiPortSelection`.

### 8. Audio in the browser

DX7 AI Patch Creator and DXcompanion both play patches with Dexed's engine, in WebAssembly and in
JavaScript. This is the backlog's open question
[Audio preview in the browser](feature-backlog.md#audio-preview-in-the-browser). Both admit that
some patches sound different on the FM1, HAMMOND2 among them, which supports labelling a preview
as a DX7 preview without the FM1's effects.

### Not taken

- **AI patch editing and a free step sequencer** (DX7 AI Patch Creator, FM-1 Utility). They need a
  server or reach beyond the FM1's own sequencer, which the [sequencer scope](../AGENTS.md#sequencer-scope)
  rules out.
- **Tags, ratings, cloud sync** (DXcompanion). Already [decided against](feature-backlog.md#decided-against),
  and sync conflicts with the client-only design.
- **Recording a rest with a lone Note Off** (FM-1 Utility). Already in
  [the recording contract](seq-rec-001-recording-contract.md) as `90 3C 00`.
- **Sending a bank of more than 32 as several transfers** (DX7 AI Patch Creator). Banks here are
  always 32.
- **Click a patch to audition it** (RK002). Slots A–D already send the voice on a click.

## UI conventions worth borrowing

- **A visible save state.** DXWire shows grey **No changes**, orange **Unsaved changes**, and green
  **Saved** beside the voice name. The editor has the unsaved-changes prompt but no constant sign.
- **KEY ON and KEY OFF on envelope graphs** (DXWire), marking where the sustain begins and the
  release starts.
- **A carrier and modulator key on the algorithm diagram** (DXWire): one colour for carriers, one
  for modulators, one for an operator switched off.
- **Names in a slot picker** (DXWire). Its **Copy to Slot** is a 32-button grid with the source and
  target lit and each slot's patch name in its tooltip.
- **Segmented buttons for short lists** (DXcompanion), such as curve, waveform, or filter type,
  where a dropdown hides two to four choices.
- **Long jobs shown as named steps** (DX7 AI Patch Creator). The 128-preset read and write could
  name the stage they are at as well as the count.
- **Front-panel steps in help** (DX7II Librarian), written press by press. The bank destination
  instructions already do this for sending a bank.

## Suggested order

1. **The channel warning (1).** Small, and it explains a fault that is otherwise baffling.
2. **Double-click to restore (2)** and **the next and previous patch keys (3).** Small editor
   gains with no new visible control.
3. **The save state and the envelope markers**, from the conventions above.
4. **Incoming notes on the keyboard (4)**, then the Program Change capture.
5. **Multi-select (5)**, if the touch work goes ahead.
