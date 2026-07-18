# M-VAVE FM1 Patch Importer

A browser-based librarian for preparing Yamaha DX7 patch banks and sending them to an [M-VAVE FM1](https://www.mvave.com/) over MIDI SysEx.

The app runs entirely in the browser: import a standard 32-voice DX7 `.syx` bank, rename or reorder its patches, and transfer the complete bank to an FM1.

![M-VAVE FM1 synthesiser](src/assets/fm1-header.png)

## Features

- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Organise up to four browser-side banks (A–D)
- Rename patches using DX7-compatible 10-character names
- Reorder patches with pointer or keyboard drag-and-drop
- Search the currently selected bank
- Export an edited bank as a `.syx` file
- Send a complete 32-patch bank to the FM1 over Web MIDI
- Select MIDI input, output, and channel
- Monitor incoming and outgoing MIDI messages
- Play notes on the FM1 from an on-screen keyboard
- Light, dark, and system colour themes

## Requirements

- An M-VAVE FM1
- A MIDI connection between the computer and FM1
- A Chromium-based browser with Web MIDI and SysEx support, such as Chrome, Edge, or Opera
- A standard 4,104-byte Yamaha DX7 32-voice bulk bank (`.syx`)

Web MIDI requires a secure context. `localhost` works during normal local development; use the HTTPS command below when accessing the development server in a context that requires HTTPS.

## Using the librarian

1. Open the app in a supported browser.
2. Choose **MIDI idle · Connect** and grant MIDI/SysEx permission.
3. Open **Settings** to select the FM1 MIDI output and, if needed, the MIDI channel.
4. Select browser bank A, B, C, or D.
5. Choose **Import DX7 bank** and select a compatible `.syx` file.
6. Rename patches or drag them into the desired order.
7. Choose **Send to FM1**.
8. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay.

The selected bank in the browser does not determine the hardware destination—the final destination is chosen on the FM1 itself.

To save an edited bank to disk, open the arrow menu beside **Import DX7 bank** and choose **Download**.

> [!IMPORTANT]
> Imported and edited banks are held in browser memory and are not restored after a page reload. Download any changes you want to keep.

## Local development

Install a current Node.js LTS release, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

To run the development server with a locally generated HTTPS certificate:

```bash
npm run dev:https
```

Your browser may ask you to accept the development certificate before loading the page.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run dev:https` | Start Vite on `127.0.0.1` with HTTPS |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run lint` | Run Oxlint |
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

The importer intentionally validates DX7 bank files before loading them. A compatible file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain a valid Yamaha checksum

Single-voice dumps, larger archive files, and banks using another SysEx format are not accepted.

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

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party attribution.
