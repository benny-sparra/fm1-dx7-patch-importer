# M-VAVE FM1 Editor & Librarian

A browser-based voice editor and patch librarian for the [M-VAVE FM1](https://www.mvave.com/).

The app runs entirely in the browser. Build and organise four local patch banks, edit every standard DX7 voice parameter, audition sounds on the FM1, and transfer individual voices or complete banks over MIDI SysEx. A built-in demo bank gets you started; standard 32-voice DX7 `.syx` bank import is also supported.

![M-VAVE FM1 synthesiser](src/assets/fm1-header.png)

## Features

- Organise up to four browser-side banks (A–D)
- Restore imported and edited banks automatically from local browser storage
- Edit all standard DX7 voice parameters and the FM1's six-effect unit, with live MIDI updates
- Rename patches using DX7-compatible 10-character names
- Reorder patches with pointer or keyboard drag-and-drop
- Undo and redo patch-library edits
- Copy patches between loaded browser banks
- Search the currently selected bank
- Export one edited bank as `.syx` or all loaded banks as a `.zip`
- Load a built-in demo bank to explore the workflow
- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Send a complete 32-patch bank to the FM1 over Web MIDI
- Select matching FM1 slots with MIDI Program Change and send individual sounds to the edit buffer
- Move between adjacent patches without leaving the editor
- Save edits to the browser library, or revert both the editor and FM1 to the last saved version
- Warn before leaving an unsaved editing session, with save, discard, and keep-editing choices
- Track whether each browser bank is local, transferred, or changed since transfer
- Select MIDI input, output, and channel
- Monitor incoming and outgoing MIDI messages
- Play notes on the FM1 from an on-screen keyboard
- Test real-time FM1 parameter editing with an audible transpose change
- Run advanced diagnostics for MIDI identity, current-voice, and bank readback support
- Light, dark, and system colour themes

## Requirements

- An M-VAVE FM1
- A MIDI connection between the computer and FM1
- A Chromium-based browser with Web MIDI and SysEx support, such as Chrome, Edge, or Opera

A standard 4,104-byte Yamaha DX7 32-voice bulk bank (`.syx`) is optional if you want to import additional sounds.

Web MIDI requires a secure context. The local development server uses HTTPS by default.

## Using the editor & librarian

1. Open the app in a supported browser.
2. Switch **MIDI online** on and grant MIDI/SysEx permission.
3. Open **Settings** to select the FM1 MIDI output and, if needed, the MIDI channel.
4. Select browser bank A, B, C, or D.
5. Choose **Import DX7 bank** and select a compatible `.syx` file.
6. Click a patch to select the matching FM1 slot, load it into the edit buffer, and open the voice editor. Use **Save to Library** to keep an edit, or **Revert to Saved** to restore the browser and FM1 working copy.
7. Choose **Send to FM1**.
8. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay.

After the first successful connection, the app remembers the selected MIDI ports and channel and reconnects automatically on future visits. Choose **MIDI online · Disconnect** to disable automatic connection.

The selected bank in the browser does not determine the hardware destination—the final destination is chosen on the FM1 itself.

To send one sound instead, choose the send icon on its patch card. This loads the sound into the FM1 edit buffer; hold **SAVE** on the FM1 to store it in the current hardware slot.

To save an edited bank to disk, open the arrow menu beside **Import DX7 bank** and choose **Download**.

> [!IMPORTANT]
> Imported and edited banks are saved in this browser and restored after a page reload. Download important banks as `.syx` files as an additional backup, especially before clearing browser data.

## Local development

Install a current Node.js LTS release, then run:

```bash
npm install
npm run setup:https
npm run dev
```

The one-time HTTPS setup uses [`mkcert`](https://github.com/FiloSottile/mkcert) to create and trust a local certificate. On macOS, install it first with `brew install mkcert`. Open the HTTPS URL printed by Vite.

To use HTTP instead, run `npm run dev:http`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run setup:https` | Create and trust the local HTTPS certificate |
| `npm run dev` | Start Vite on `127.0.0.1` with HTTPS |
| `npm run dev:http` | Start the Vite development server with HTTP |
| `npm run dev:https` | Start Vite on `127.0.0.1` with HTTPS |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run lint` | Run Oxlint |
| `npm test` | Run the automated unit tests |
| `npm run preview` | Preview the production build locally |

## Tech stack

- React 19 and TypeScript
- Vite
- Tailwind CSS
- WebMidi.js
- dnd-kit
- Motion
- Lucide icons

## SysEx compatibility

The DX7 import feature intentionally validates bank files before loading them. A compatible file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain a valid Yamaha checksum

Single-voice dumps, larger archive files, and banks using another SysEx format are not accepted.

The browser library is the source of truth. The current FM1 firmware does not document transmission of stored voices or banks over MIDI, so the librarian cannot import a bank directly from the hardware. Keep `.syx` source files or download browser banks as backups. If M-VAVE adds bulk-dump output in a future firmware release, device-to-browser bank import can be added without changing the saved library format.

## Future development

Future development could add richer DX7 visualizations, grouped modulation workflows, and device readback if M-VAVE documents a compatible transmit protocol.

## Project structure

```text
src/
├── components/       UI, MIDI controls, and patch-bank components
├── data/             Patch-slot metadata
├── hooks/            Patch-library, MIDI, and theme state
├── lib/              DX7 SysEx parsing, MIDI transfer, and utilities
└── routes/           Main application layout and librarian page
```

## Acknowledgements

The interface links to independent DX7 patch archives to help users find compatible banks. Those downloads are provided by their respective sites; only import files you trust.
