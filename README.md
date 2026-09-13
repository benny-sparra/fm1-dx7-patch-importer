# M-VAVE FM1 Editor & Librarian

A browser-based voice editor and patch librarian for the [M-VAVE FM1](https://www.mvave.com/).

The app runs entirely in the browser. Build and organise up to 10 local patch banks, edit every standard DX7 voice parameter and the FM1 effects chain, and transfer individual voices or complete banks over MIDI SysEx. Four classic Yamaha DX7 factory banks are loaded initially. New workspace banks can use any of 35 bundled catalog banks or a standard 32-voice DX7 `.syx` upload.

![M-VAVE FM1 synthesiser](src/assets/fm1-header.png)

## Features

- Start with Yamaha DX7 ROM 1A, ROM 1B, ROM 2A, and ROM 2B in browser banks A–D
- Add up to six additional workspace banks from the bundled DX7 bank catalog or your own SysEx file, so every bank starts populated
- Rename, describe, or delete workspace banks, with descriptions available from their tabs
- Replace a populated bank only after confirming that its current sounds will be overwritten
- Restore the four factory banks at any time without removing additional workspace banks
- Restore imported and edited banks automatically from IndexedDB browser storage
- Retry browser-storage failures or continue explicitly with a session-only workspace without overwriting unreadable saved data
- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Search and reorder patches with pointer or keyboard drag-and-drop
- Export one browser bank as `.syx` or all loaded banks as a `.zip`
- Edit all standard DX7 voice parameters with live MIDI updates
- Work on the six operators as a rack: five sit as compact readouts while the selected one opens in place with its full controls
- Mute or solo any operator straight from its rack column, without opening it first
- Fold the operators and effects panels away to focus the editor on the sections in use
- Visualise all 32 DX7 algorithms, including carrier and modulator roles
- Edit four-stage amplitude and pitch envelopes graphically or with precise numeric controls
- Start the pitch envelope from Flat, Attack blip up, Attack drop, Scoop, or Release fall shapes as a single undo step
- Watch the LFO on a scrolling scope that follows the selected wave and LFO Speed
- Edit the FM1's filter, reverb, delay, distortion, chorus, and phaser within their documented ranges
- See a live animated scope for every FM1 effect, drawn from its parameters: filter response, delay taps, chorus drift, reverb tail, distortion clipping, and phaser sweep
- Apply six sound-shaping presets as undoable starting points
- Generate a musically constrained random DX7 voice as an undoable starting point
- Open contextual help for voice, envelope, algorithm, and effect controls
- Rename patches using DX7-compatible 10-character names
- Undo and redo edits within the voice editor
- Save edits to the browser library, resend them, or revert both the editor and FM1 to the last saved version
- Warn before leaving an unsaved editing session, with save, discard, and keep-editing choices
- Undo, redo, save, and leave the voice editor from the keyboard
- Jump to patch search, clear it, and open the lit slot from the keyboard
- Send individual sounds to the edit buffer or a complete 32-patch bank over Web MIDI
- Select matching FM1 slots with MIDI Program Change and track whether a bank is local, transferred, or changed since transfer
- Select MIDI input and output ports, with separate channels for notes/program changes and FM1 effects
- Monitor incoming and outgoing MIDI messages, inspect SysEx data, and copy it as hexadecimal
- Play notes on the FM1 from an on-screen keyboard
- Use the interface in English, French, Spanish, German, Brazilian Portuguese, or Simplified Chinese
- Use a dark CRT-terminal interface whose accent, product image, and tab icon follow any of the six FM1 colour finishes, with contrast checked to WCAG 2.2 AA in each
- Install the editor as a standalone desktop app in browsers that support installation

## Requirements

- An M-VAVE FM1
- A MIDI connection between the computer and FM1
- A desktop computer with a Chromium-based browser that supports Web MIDI and SysEx, such as
  Chrome, Edge, or Opera. Phones and tablets are not supported.

A standard 4,104-byte Yamaha DX7 32-voice bulk bank (`.syx`) is optional if you want to import additional sounds.

Web MIDI requires a secure context. The local development server uses HTTPS by default.

## Using the editor & librarian

1. Open the app in a supported browser.
2. Switch **MIDI online** on and grant MIDI/SysEx permission.
3. Open **Settings** to select the FM1 MIDI output and, if needed, the note/program and effects channels.
4. Select DX7 Bank 1, 2, 3, or 4. On first use these contain DX7 factory ROM 1A, ROM 1B, ROM 2A, and ROM 2B respectively. Use **Add new bank** to name and describe an additional workspace bank while populating it from the bundled [Yamaha Black Boxes DX7 catalog](https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/) or your own standard 32-voice DX7 SysEx file.
5. Click a patch to select the matching FM1 slot and play it. Double-click it, or choose **Edit** in the toolbar, to load it into the edit buffer and open the voice editor. Changes are sent live once the initial voice and effects have reached the FM1.
6. Use **Save to Library** to keep an edit, or open its adjacent menu to resend the working copy or **Revert to Saved** on both the editor and FM1.
7. Return to the librarian and choose **Send to FM1** to transfer the selected browser bank.
8. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay.

See the [user guide](docs/user-guide.md) for bank management, the voice editor, keyboard
shortcuts, and SysEx compatibility.

### Your data

> [!IMPORTANT]
> Imported voices, edits, and FM1 effect settings are saved in this browser and restored after a page reload. Download important banks as `.syx` files as an additional backup, especially before clearing browser data. DX7 `.syx` export contains voice data only; the FM1-specific effect settings remain in the browser library.

Workspace-bank titles, descriptions, imported sounds, voice ordering, saved editor changes, and FM1 effect settings are saved automatically in the browser.

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

The interface links to independent DX7 patch archives to help users find compatible banks. Those downloads are provided by their respective sites; only import files you trust.
