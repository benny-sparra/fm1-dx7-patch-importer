# Baud Girl's Device Manager: ideas for the editor

Reviewed 2026-10-10 against
[Baud Girl's Device Manager](https://baudgirl.com/work/FM-1+VA/device-manager) as served that day,
with FM-1+VA at Version 97, and against [`feature-backlog.md`](feature-backlog.md) and
[`fm1-research.md`](fm1-research.md). Nothing here is planned yet. An idea moves into the backlog
when it is chosen, and anything that sends a new FM-1+VA command still needs its approval in
`AGENTS.md` first.

## What the Device Manager has

**Library** puts the FM1 on the left, as banks A–D and Patterns with a search field, and a source on
the right: the VA pack, the 8-Bit pack, presets kept in the browser, or a file. **Place** and
**Place all 16** put source presets in FM1 slots, and **Keep** stores an FM1 preset in the browser.
Under them are **Rename**, **Swap with…**, **Save as a file**, **Back up everything** (a presets
file and a separate patterns file), **Install a backup**, and **Undo**.

**Studio** sets a pattern editor beside a preset editor, under one Play, Pattern, Preset, Tempo, and
Undo/Redo bar. The pattern editor has up to 64 steps, Rate from 1/1 to 1/32T, Chain, and Notes and
parameter Locks lanes. The preset editor, for an FM preset, has these sections: Preset (Algorithm,
Feedback, Osc Sync, Transpose, Mono), Operators, Filter, Pitch Envelope, LFO, Envelope, Effects,
and Knobs.

## What the editor already covers

Reading the FM1's presets, writing only the presets that differ and reading each back, importing
the presets file, VA and FM tags on cards, search, the seven effects with Distortion type, Bitcrush,
and their order, Undo and Redo, and the on-screen keyboard's octave shift.

## Ideas

### 1. An FM preset's own Filter, Envelope, and Mono

FM-1+VA gives an FM preset the same Filter and Envelope that a Virtual Analog preset has. The Filter
has Type (LP12, LP24, BP, HP), Cutoff, Resonance, Filter Envelope, Decay, Shape, Velocity, Key
Tracking, and LFO to Cutoff. The Envelope is an ADSR. Mono is also a record setting. The
voice editor leaves all of these as read, and `AGENTS.md` lists the preset's own Filter and
Envelope among the bytes the editor cannot set.

- **Mapped already.** The Filter uses record bytes 23–26 and 47–51, with bit 4 of byte 26 as an FM
  preset's Filter switch. The Envelope is bit 6 of byte 53 and bytes 54–57, and Mono is byte 58
  (`fm1-research.md`, "Every row of a Virtual Analog preset"). `src/lib/fm1-va-virtual-analog-editor.ts`
  already writes these rows bit by bit for Virtual Analog presets.
- **Heard once written**, like Distortion type, unless the FM-1+VA controllers reach them. An FM
  preset takes CC 70–78 as its own Envelope, LFO, and Brightness, so a short hardware run should
  find out whether any of them moves the FM Filter or Envelope live.
- Offered only for a patch with a record, while `hasFm1VaPresetCommands` allows the preset write.

### 2. Knob assignments

From `FM-1_096`, each preset chooses what KNOB1–4 do: Brightness, Feedback, Attack, Decay, Release,
Vibrato, LFO Speed, or Cutoff. These are bits 0–5 of bytes 53 (knobs 1 and 2) and 52 (knobs 3 and
4), with bit 7 marking the choice as set. The backlog notes knob choices as not offered. The change
is four dropdowns, written into the record and heard once written, while `playsFm1VaBitcrush` (from
`FM-1_096`) allows it.

### 3. Swap two patches

Swapping two slots, in one bank or across two, is one step in the Device Manager. Here it takes two
**Copy to…** steps and a spare slot. It is one library change with one Undo, and it carries each
patch's voice, effects, record, and Virtual Analog bytes. It needs no protocol.

_Built 2026-10-10:_ **Copy to…** offers **Swap with** beside **Replace** for a patch in a bank
slot, through `swapVoices` in `src/lib/patch-library.ts`.

### 4. Rename without opening the editor

The Device Manager renames from the library. Here a patch is renamed in its editor's name field, which
also sends the patch to the FM1.

### 5. Save one Virtual Analog patch as a file

**Save as a file** saves one preset as a single 231-byte preset write. **Download patch** here is a
DX7 single-voice file, so a Virtual Analog patch cannot be downloaded at all. The presets file
import already reads a file of 1 to 128 preset writes, so the round trip works today.
_Built 2026-10-10:_ **Download patch** on a Virtual Analog or 8-Bit patch saves one preset write.

### 6. Source packs beside the FM1

The VA and 8-Bit packs are Baud Girl's own presets. Bundling them in the catalog would need
Madeline's permission, so ask before building anything. The import dialog already covers a pack
file the user has saved.

### 7. Patterns

FM-1+VA's `7D 20` writes a pattern directly, which is the transfer
[the parked sequencer](fm1-roadmap.md) was waiting for (backlog item 7). The only `7D 20` write
tried so far went over Bluetooth and did not land, so the next step is the same write over USB. A
read-only view of the patterns file, as **Back up everything** saves it, could come before any write.

### 8. Clock Out (Version 97)

The FM1 can now send MIDI clock, with Start and Stop, at its own tempo. This partly answers the
backlog's open question on MIDI clock and transport, and the audition phrases could follow it. For
now, record it in that open question and build no UI.

### Not taken

- **8-Bit presets.** These are backlog item 9, still waiting for a stored shape of their own.
- **The "128 presets · 16 patterns" summary.** It is cosmetic.

## Keeping the options down

Every idea above is something the user can do, but not all of them deserve a control of their own.
The slot ⋮ menu has five items today: **Edit**, **Copy to…**, **Import patch…**, **Download
patch**, and, on a Virtual Analog slot, **Change to FM…**. **Library actions** has about eight. The
voice editor is already the densest page. Before anything is added, these rules hold:

1. **Extend a dialog that exists before adding a menu item.** A new action that ends in the same
   place as an existing one belongs in that one's dialog.
2. **One route per action, plus at most one shortcut.** The menu is the keyboard route, and a drag
   may be the quick route, as copying already is. A third way to do the same thing is not added.
3. **Show what the firmware can use, and nothing else.** A control that only FM-1+VA reads is
   absent on other firmware, not disabled. A user on M-VAVE's firmware never sees it.
4. **Fold what is rarely changed.** Sections that most patches leave alone start folded, using the
   rack panel pieces in `src/components/ui/rack-panel.tsx`.
5. **Count before and after.** Each change says how many menu items and visible controls it adds,
   on stock firmware and on FM-1+VA. An addition that cannot come to zero on stock firmware has to
   earn its place.

Applied to the ideas:

| Idea                         | Placement                                                                                                                                                                     | Added on stock firmware | Added on FM-1+VA                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------- |
| 1. Filter, Envelope, Mono    | One folded **FM-1+VA** rack panel in the voice editor, for a patch with a record                                                                                              | Nothing                 | One folded panel                         |
| 2. Knob assignments          | Inside the same panel                                                                                                                                                         | Nothing                 | Nothing beyond 1                         |
| 3. Swap                      | In **Copy to…**: when the chosen slot holds a patch, the confirmation offers **Swap** beside **Replace**                                                                      | One button in a dialog  | One button in a dialog                   |
| 4. Rename                    | Leave it out. The editor's name field already does it, and the editor is one click away. Revisit only if renaming Virtual Analog patches turns out to be common               | Nothing                 | Nothing                                  |
| 5. Save a VA patch as a file | **Download patch** saves the file that suits the engine: DX7 `.syx` for an FM patch, Baud Girl's preset file for a Virtual Analog one, with the item's hint line naming which | Nothing                 | No new item; it is now shown on VA slots |
| 6. Source packs              | Not built                                                                                                                                                                     | Nothing                 | Nothing                                  |
| 7. Patterns                  | Its own view, if the USB write works; the largest addition here, so it is decided on its own                                                                                  | Nothing                 | To be decided                            |
| 8. Clock Out                 | No UI                                                                                                                                                                         | Nothing                 | Nothing                                  |

Taken together, 1–5 add one button inside an existing dialog and one folded editor panel that shows
only on FM-1+VA. No menu item is added.

### Worth asking while counting

These are questions, not proposals:

- Now that **Download backup** exists, how often is **Download all banks (.zip)** used? It is the
  DX7 route for other tools, so it may still earn its place, but analytics could answer this.
- Should **Change to FM…** and the planned **Erase patch…** be one item? The backlog already
  plans for **Erase patch…** to take the place of **Change to FM…** on FM-1+VA.

## Suggested order

1. **Swap (3)**, inside **Copy to…**. It is cheap, needs no protocol, and helps every firmware.
2. **Virtual Analog download (5)**, under the existing item.
3. **The FM-1+VA panel (1 and 2)**, as one editor change, after a short hardware run to see whether
   CC 70–78 reach an FM preset's Filter or Envelope live.
4. **The USB `7D 20` test (7)**, before any decision on patterns.
