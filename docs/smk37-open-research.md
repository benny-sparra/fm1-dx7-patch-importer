# SMK37 OPEN: released source

M-VAVE released SMK37 OPEN V01, its Official Open groovebox ported to the SMK-37 Pro and Elite,
at <https://github.com/m-vave/smk37_open> (one commit, `b2d6bcb`, read 2026-11-17). Everything
here comes from that source. **Confidence: Likely. Needs hardware test**: no SMK-37 has run it
with the editor yet.

## What it is

The same eight-track groovebox as Official Open on the FM1 (`docs/fm1-research.md`, "Official
Open: released source"): DX7, 303, 808, PSG, PLUCK, and SAMPLER engines, 16 project slots, and a
128-voice DX7 library in four groups of 32. The hardware drivers live in `app/board/`; the
transfer code, MIDI router, and engines match Official Open's.

## Identity

`app/version.h` names the release `SMK-37 Pro_8000001` or `SMK-37 Elite_8000001`. Its updater
(`sdk/WebUpdate.js:60`) also accepts `SMK37P_OPEN_` or `SMK37E_OPEN_` and three digits. The
editor reads all four as the `official-open` family (`classifyFm1Firmware`) on the `smk37`
device (`fm1Device`), and names the release from the last digits (V1). It answers the updater's
identity query, which the updater needs before it flashes.

## SysEx it takes

`fm1_app_sysex` (`app/transfer.c:37–49`) queues three shapes and drops every other SysEx message,
and anything over 192 bytes:

- the transfer protocol, `F0 7D 'F' 'M' 02 <cmd> <token> <packed data> <sum> F7`, with Official
  Open's framing, packing, checksum, token echo, and cached replies;
- MMC Stop and Play;
- a 163-byte DX7 single-voice dump, `F0 43 0n 00 01 1B …`.

So, as on the FM1, it drops DX7 parameter changes and a 4,104-byte bank dump.

A single-voice dump with a valid checksum goes to every track not switched off whose input
channel is the dump's channel `n` (`transfer.c:272–288`), and `groove_fm_import`
(`web/engine/sound.c:1607`) takes it only on a DX7 track, as an unsaved edit of the project.

Command 0 (`transfer.c:136–146`) answers in Official Open's 14-byte format 4: the slot count,
the current slot, the project size, the clock mode, and the eight tracks' engines in the same
order, so `parseOfficialOpenInfoReply` reads it unchanged.

Commands 1–10 and 22 match Official Open's. Commands 3–5 with kind 4 write a 4,096-byte bank into
one of the four library groups in Flash, which stays **Dangerous / excluded**, as on the FM1.

## Channel messages

- **Program Change** on a DX7 track loads that program from the keyboard's own 128-voice library
  (`sound.c:777–792`), so the editor sends none.
- **CC 7** sets a track's volume, and CC 64, 120, 121, and 123 work as usual. The effect
  controllers would land on whatever track listens on the FX channel, so the editor sends none.

## Tracks and channels

Tracks 1–7 listen on channels 1–7 and track 8 on channel 10 by default, as the editor's
`officialOpenTrackForChannel` assumes. Unlike on the FM1, a track's **IN CH** can be changed on
the keyboard (SEQ 6/7 MIDI TRACK, K1), and tracks sharing a channel are layered. Command 0 does
not report input channels, so the editor's check that a channel's track runs DX7 is right only
while the defaults hold.

## What the editor does

Since 2026-11-17 the editor treats SMK37 OPEN as Official Open: a patch goes as a single-voice
dump to the note channel's track once command 0 shows it running DX7; edits go as whole voices;
no bank, Program Change, or effect controller is sent. The page names the SMK-37 as the device.
**Receive from the FM1…** reads a library bank or a DX7 track's patch into the library with
commands 1, 2, and 6 (kinds 4 and 1), the reads approved for Official Open on 2026-10-20, which
change nothing on the keyboard.

## Still to check on hardware

1. Identity: the editor sees `SMK-37 Pro_8000001` (or Elite) and picks the port that answers.
2. Command 0 reply on a fresh project, and after changing track 2 to 303.
3. A dump on channel 1 reaches track 1, and nothing reaches a 303 track.
4. The ports SMK37 OPEN lists over USB, and whether the Private port is still the one that answers.
5. A bank dump does nothing (the editor no longer sends one, so only a manual test).
6. **Receive from the FM1…** reads each library group, its first patch matching program 1 of that
   group on the keyboard, and a DX7 track's patch, edits included or as last saved.

## Later, with approval

- Writing a library group (commands 3–5 with kind 4) would give **Send to SMK-37** a real bank
  destination, but writes Flash, so it needs the owner's approval recorded in AGENTS.md first.
