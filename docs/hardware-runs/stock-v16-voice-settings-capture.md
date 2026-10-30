# V16 Voice settings: capture run sheet

A capture, not a test: the editor sends nothing in this run. It answers question 11 of
`docs/fm1-research.md`'s V16 section: does any M-VAVE tool use the updater protocol's settings
block (object 4), which the firmware reading of 2026-10-27 found sets the channel of the Voice
selected on the FM1's screen?

**Sending that block from the editor is not approved.** It is a `00 32` message, which
`docs/fm1-research.md` §6.3 and `AGENTS.md` keep **Dangerous / excluded** apart from the identity
query. Whatever this run shows, sending it needs its own approval recorded in `AGENTS.md` first,
and no code here or in the editor builds it.

Run it on the orange FM1 (stock V16, `FM-1_016`).

## Stop rules

- Use only screens that read or show settings. Never press anything named Update, Upgrade,
  Restore, Factory, Recovery, Flash, or Write, in any language: §6.3's restore writes the four
  banks to Flash, and the same updater build is reported to downgrade the firmware.
- If the tool starts an update or a restore by itself, unplug the USB cable at once and note what
  the FM1 shows.
- Don't replay anything captured, from any tool.

## Before you start

1. On the FM1, write down Voices 1–8's preset, channel, and On/Off, and which Voice is selected.
2. Install a MIDI spy that sees both directions: MIDI Monitor on macOS (spy on output, and the FM1
   as a source), or MIDI-OX with its port monitor on Windows. The updater runs on Windows, so a
   Windows machine or VM with USB passthrough is likely needed.
3. Close the editor and anything else that has the FM1's ports open.

## Capture

1. Start the spy, then open M-VAVE's Windows updater with the FM1 connected.
2. Let it identify the FM1. Expect `F0 00 32 45 00 00 00 40 7F F7` and the 41-byte reply.
3. Open every screen that shows or changes device settings, if it has any (MIDI channel,
   Voices, Globe). Change one value at a time, to a value you will put back, and note the time of
   each change.
4. Close the updater and save the spy's log beside this file as
   `stock-v16-voice-settings-capture-<date>.txt`.
5. On the FM1, check Voices 1–8 against step 1 of "Before you start", and put back anything that
   changed. Don't press SAVE unless you want the change kept.

## Reading the log

Each `F0 00 32 … F7` message is a frame packed seven bits at a time, least significant bit first.
Unpacked, it reads `00 59 <command> <length, 3 bytes> <payload> <checksum>`; the payload's first
byte is the object.

- [ ] Any frame with command `0x22` (write) or `0x23` (read) on object `04`? Note its offset,
      length, and the bytes around it, and which change on the FM1 it matched.
- [ ] Any frame on another object, or with a command not listed in `docs/fm1-research.md`?
- [ ] Did the FM1's selected Voice change channel, and did any other Voice change?

Record the run as `stock-v16-voice-settings-capture-<date>.md` and update question 11.
