# M-VAVE FM1 Editor & Librarian

A browser-based voice editor and patch librarian for the [M-VAVE FM1](https://www.mvave.com/).

The app runs entirely in the browser. Build and organise up to 10 local patch banks, edit every standard DX7 voice parameter and the FM1 effects chain, and transfer individual voices or complete banks over MIDI SysEx. The FM-1's own four factory banks are loaded initially. New workspace banks can use any of 39 bundled catalog banks or a standard 32-voice DX7 `.syx` upload.

![M-VAVE FM1 synthesiser](src/assets/fm1-header.png)

## Features

- Start with the FM-1's four factory banks in browser banks A–D, so slot names match the patches on a stock FM1
- Add up to six additional workspace banks from the bundled DX7 bank catalog or your own SysEx file, so every bank starts populated
- Rename, describe, or delete workspace banks, with descriptions available from their tabs
- Replace a populated bank only after confirming that its current patches will be overwritten
- Reset banks A–D to the four factory banks at any time without removing additional workspace banks
- Download a backup of every workspace bank, FM1 effect setting, and saved bank in one file, and restore it later
- Save named copies of a bank in the browser, then load, rename, copy, download, or delete them later
- Copy a patch and its FM1 effects over any slot in a bank that has patches, from its **⋮** menu or
  by dragging it onto a bank
- Undo deleting a bank, resetting to the factory patches, restoring a backup, importing over or loading into a bank, or copying a patch over a slot, from its notification or with Cmd/Ctrl + Z
- Keep imported and edited banks across page reloads in IndexedDB browser storage
- Retry browser-storage failures or continue explicitly with a session-only workspace without overwriting unreadable saved data
- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Download a single patch as a DX7 `.syx` file, or import one over a slot, from the slot's **⋮** menu (**Download patch** and **Import patch…**)
- Search every bank at once, and reorder patches with pointer or keyboard drag-and-drop
- Search your saved banks and the 39 bundled DX7 catalog banks at the same time, play any match through the FM1 edit buffer, and copy it into a slot of your own, or double-click it to copy it and open it in the editor
- Export one browser bank as `.syx`, or every loaded bank as a `.zip` of SysEx files for Dexed, a DX7, or other DX7 tools (DX7 data only, without FM1 effects)
- Edit all standard DX7 voice parameters with live MIDI updates
- Work on the six operators as a rack: five sit as compact readouts while the selected one opens in place with its full controls
- Mute or solo any operator straight from its rack column, without opening it first
- Copy an operator's settings and paste them onto another operator, in the same patch or a different one
- Fold the operators and effects panels away to focus the editor on the sections in use
- Visualise all 32 DX7 algorithms, including carrier and modulator roles
- Edit four-stage amplitude and pitch envelopes graphically or with precise numeric controls
- Start the pitch envelope from Flat, Attack blip up, Attack drop, Scoop, or Release fall shapes as a single undo step
- Watch the LFO on a scrolling scope that follows the selected wave and LFO Speed
- Edit the FM1's filter, reverb, delay, distortion, chorus, and phaser within their documented ranges
- Start any FM1 effect from a preset in its box, such as Small room, Slapback, Chorus wash, or Warm drive, as a single undo step
- See a live animated scope for every FM1 effect, drawn from its parameters: filter response, delay taps, chorus drift, reverb tail, distortion clipping, and phaser sweep
- Start from the Presets menu: Yamaha's DX7 INIT VOICE, a musically constrained random DX7 voice, or six sound-shaping presets, each as a single undo step
- Open contextual help for voice, envelope, algorithm, and effect controls
- Rename patches using DX7-compatible 10-character names
- Undo and redo edits within the voice editor
- Compare edits with the saved sound, switching the FM1 between the two while editing pauses, without losing the edits or their undo history
- Save edits to the browser library, resend them, or revert both the editor and FM1 to the last saved version
- Warn before leaving an unsaved editing session, with save, discard, and keep-editing choices
- Undo, redo, save, and leave the voice editor from the keyboard
- Jump to patch search, clear it, and open the lit slot from the keyboard
- Send individual patches to the edit buffer or a complete 32-patch bank over Web MIDI in Chrome, Edge, Opera, or Firefox
- Select matching FM1 slots in banks A–D with MIDI Program Change, and audition patches from added banks through the edit buffer
- Select MIDI input and output ports, with separate channels for notes/program changes and FM1 effects
- Monitor incoming and outgoing MIDI messages, inspect SysEx data, and copy it as hexadecimal
- Play notes on the FM1 from an on-screen keyboard
- Use the interface in English, French, Spanish, German, Brazilian Portuguese, or Simplified Chinese
- Use a dark CRT-terminal interface whose accent, product image, and tab icon follow any of the six FM1 colour finishes, with contrast checked to WCAG 2.2 AA in each
- Install the editor as a standalone desktop app in browsers that support installation

## Requirements

- An M-VAVE FM1
- A MIDI connection between the device and FM1
- A browser that supports Web MIDI and SysEx, such as Chrome, Edge, Opera, or Firefox. Chrome on
  Android works as well; Safari and Firefox on mobile do not expose Web MIDI.

A standard 4,104-byte Yamaha DX7 32-voice bulk bank (`.syx`) is optional if you want to import additional patches.

Web MIDI requires a secure context. The local development server uses HTTPS by default.

## Using the editor & librarian

1. Open the app in a supported browser.
2. Switch **MIDI online** on and grant MIDI/SysEx permission. Firefox asks you to install a small site permission add-on instead; accept it.
3. Open **Settings** to select the FM1 MIDI output and, if needed, the note/program and effects channels.
4. Select Bank 1, 2, 3, or 4. On first use these contain FM-1 Banks 1, 2, 3, and 4, the patches the FM1 ships with. Use **Add new bank** to name and describe an additional workspace bank while populating it from the bundled [Yamaha Black Boxes DX7 catalog](https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/) or your own standard 32-voice DX7 SysEx file.
5. Click a patch to select the matching FM1 slot and play it. The FM1 has four banks, so a patch in an added bank is sent with its effects to the edit buffer to play it instead. Double-click it, or choose **Edit** from its **⋮** menu, to load it into the edit buffer and open the voice editor. Changes are sent live once the initial voice and effects have reached the FM1.
6. Use **Save to Library** to keep an edit, or open its adjacent menu to resend the working copy or **Revert to Saved** on both the editor and FM1.
7. Return to the librarian and choose **Send to FM1** to transfer the selected browser bank.
8. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay.

See the [user guide](docs/user-guide.md) for bank management, the voice editor, keyboard
shortcuts, and SysEx compatibility.

### Your data

> [!IMPORTANT]
> Imported voices, edits, and FM1 effect settings are saved in this browser and kept after a page reload. Use **Download backup**, under **Full backup** in the patch-bank ⋮ menu, to keep a copy, especially before clearing browser data: the backup file holds the workspace banks, their FM1 effects, and saved banks, and only this app can restore it. DX7 `.syx` export contains voice data only, for use in other DX7 tools.

Workspace-bank titles, descriptions, imported patches, patch ordering, saved editor changes, and FM1 effect settings are saved automatically in the browser.

If the saved workspace cannot be opened, the app leaves its browser record untouched and offers **Retry** or **Continue without saving**. The latter creates an explicit session-only workspace whose changes are lost when the page closes. If a later save fails, the latest changes remain available in memory and can be saved again with **Retry saving**.

## Privacy

The deployed site uses cookie-free, aggregate usage analytics and error monitoring. Patch and bank
names, uploaded filenames, MIDI port identities, and SysEx data are never sent. See
[PRIVACY.md](PRIVACY.md) for details.

## Documentation

- [User guide](docs/user-guide.md): using the librarian and voice editor, keyboard shortcuts, and
  SysEx compatibility
- [Privacy](PRIVACY.md): anonymous usage analytics and error monitoring
- [Contributing](CONTRIBUTING.md): local development, quality checks, scripts, and project structure
- [Maintaining](docs/maintaining.md): deployment security, generated assets, source maps, and
  Lighthouse
- [FM1 research notes](docs/fm1-research.md): the evidence behind FM1-specific MIDI behaviour

## FM1 protocol research

The repository records the evidence behind FM1-specific behaviour in
[the FM1 research notes](docs/fm1-research.md). The live effect controls use the documented
24-controller FM1 effects block, with their supported ranges enforced by the editor. The internal
sequencer is being researched through captured fixtures only; it is not yet exposed in the app and
the editor does not send sequencer or other unclassified vendor commands.

## Future development

Future development could add grouped modulation workflows, a focused internal-sequencer editor once
its protocol is proven safe, and device readback if M-VAVE documents a compatible transmit protocol.

## Acknowledgements

The randomiser is an independent implementation of the voice generator from Tom Bajoras's DX Android, following [the algorithm documented by Christian Zietz (czietz) at CHZ-Soft](https://www.chzsoft.de/site/hardware/dx-android-an-intelligent-random-dx7-voice-generator/dx-android-algorithm/).

The four FM-1 factory banks, loaded into banks A–D on first use and also offered in the catalog, were recovered from M-VAVE's preset-restore tool by KingParamount and are bundled unchanged under CC0 from [fm1-factory-presets](https://github.com/KingParamount/fm1-factory-presets). The licence covers the capture, decode and rebuilt files, not the voices themselves: those trace to Yamaha ROM and VRC cartridges and the community Dexed_cart 1.0 collection, as selected and renamed by M-VAVE. The repository documents the per-voice provenance.

The interface links to independent DX7 patch archives to help users find compatible banks. Those downloads are provided by their respective sites; only import files you trust.

If you have programmed a DX7 bank of your own, you can offer it for the bundled catalog: see [Contributing a patch bank](CONTRIBUTING.md#contributing-a-patch-bank).
