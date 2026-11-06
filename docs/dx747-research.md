# DX747: what the editor could do with it (read 2026-11-06)

> Status: research note, read from source only. Nothing here was sent to an FM1, and no
> application code changed. Confidence levels follow `docs/fm1-research.md`: **Confirmed**,
> **Likely**, **Needs hardware test**, **Dangerous / excluded**. A claim marked Confirmed here is
> confirmed from DX747's source; it still needs a hardware run before production code relies on it.

## Source

- https://github.com/esbenvb/fm1-dx747, branch `dx747`, commit
  `02c6a1957781f5468086af5915273e9465e5fc17` (2026-11-06), release v0.1 beta. Paths and line
  numbers below are in that commit. GPL-3.0-only with the FM1 SDK's linking exception: this note
  describes its behaviour and quotes no code, and nothing from it should be copied into this
  MIT-licensed editor.
- The author's own docs in that tree: `DX747.md`, `docs/MIDI.md`, `docs/CONFIG-PROTOCOL.md`,
  `docs/design/PARTS-MODEL.md`, `docs/ON-DEVICE-CHECKLIST.md`.
- The PDF manual (`docs/DX747-Manual.pdf`) was not read; `DX747.md` and `docs/MIDI.md` are the
  author's own reference for the same behaviour.

The author says the firmware has run on one real FM1 and "works", but most details are proven only
in their simulator and host tests (`DX747.md:16–21`; `docs/ON-DEVICE-CHECKLIST.md` lists what is
open). The configuration protocol is "not yet tried on a unit" (`docs/CONFIG-PROTOCOL.md:6–7`).

## Summary

- **What it is.** A fork of M-VAVE's Official Open (base `4c7496d`) that removes the sequencer,
  sampler, and non-DX7 engines and puts **parts** on top of the eight DX7 engines: up to eight parts,
  each on its own MIDI channel (1–16), each one to eight **layers** (one DX7 voice on one engine,
  with its own key window, velocity window, shift, level, pan, sends, BRIGHT, and voice limit). A
  fresh unit has eight one-layer parts on channels 1–8 (`DX747.md:25–51`;
  `app/dx747/parts.inc:25–34`). It is a multitimbral DX7 module, not a groovebox.
- **Ben's hypotheses.** (1) It is closer to stock V16 than to Official Open in what a user does
  with it, and its multitimbral control is much better than V16's: every part is addressed by its
  own channel, for notes, controllers, Program Change, parameter changes, and dumps alike, where
  V16 sends a dump to whichever Voice is selected on the FM1's screen. Underneath, though, it is
  Official Open: the same identity shape, the same `F0 7D 46 4D` transfer protocol, the same 192-byte
  SysEx mailbox, and the same 128-voice library. (2) Yes: the voice editor's DX7 parameter changes
  and single-voice dumps both work, on the channel of the part, landing on that part's **framed
  layer**. (3) Yes: the repo documents the protocol fully, and the source agrees with the docs where
  checked below.
- **Today the editor misidentifies it.** DX747 reports `FM-1_8747747` (`app/version.h:13–14`), which
  matches the editor's Official Open pattern `FM-1_8(\d{6})` (`src/lib/fm1-firmware.ts:36`), so the
  badge would read Official Open V747747 and the Official Open profile applies. Some of that works
  by accident, some fails silently (below). The smallest safe first step is a `dx747` family.

## Identity

**Likely** (source; Official Open's same mechanism is Confirmed on hardware, `docs/fm1-research.md`,
"Official Open: released source"). The identity is the SDK's `fm1_update_identity`, the 27-byte
constant `FM1_UPDATE_PRODUCT` = `FM-1_8747747`, answered by the sealed SDK to the updater's identity
query, which is byte for byte the editor's `fm1IdentityQuery` (`app/version.h:5–14`;
`sdk/Build.ps1:102,404`). The release label `V01` is shown on the boot screen and returned by
DX747's own HELLO, not by the identity reply. The author chose six digits above 999 so that no
M-VAVE Open release can collide with it (`app/version.h:9–11`), so `FM-1_8747747` is safe to match
exactly. A later DX747 release may change the digits; nothing in the repo says how it will number
them, so match only the identity seen, and treat any other `FM-1_8` name above 999 as unidentified
rather than as Official Open (**Needs hardware test** for each release).

DX747's HELLO (command 23, below) answers `'D' 'X' 1 …` and the release `V01`, which would tell
DX747 from Official Open without relying on the number, but it is not an approved message.

## What each part accepts

All from `docs/MIDI.md` and `app/dx747/route.inc`, `app/dx747/ctl.inc`, `app/midi_router.c`.
**Confirmed** from source, **Needs hardware test** on the FM1.

The router takes every short message from DIN, USB, BLE, and the built-in keys
(`app/midi_router.c:91–98`), and rewrites it onto the private channel of each engine it is for
(`app/dx747/route.inc:7–16`: engines 0–7 on private channels 1–7 and 10, Official Open's track
channels). A part's channel is public; the private channels never show.

| Message on a part's channel                                    | Effect                                                                                                                                                                        | Source                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Note on/off, poly pressure                                     | every layer whose key and velocity windows hold it, shifted per layer                                                                                                         | `MIDI.md:28–42`                      |
| Program Change 0–127                                           | one-layer part: loads library voice n (A01–D32) and cuts its notes. Layered part: collapses to the first layer playing that voice over the whole keyboard, freeing the others | `MIDI.md:61,81`; `route.inc:316–331` |
| CC 0 then PC                                                   | bank 0 only; any other bank makes the PC ignored; remembered per channel                                                                                                      | `MIDI.md:80`; `route.inc:332–334`    |
| CC 7                                                           | the **part level**, scaling every layer; not passed to the engine                                                                                                             | `MIDI.md:79`; `route.inc:335–338`    |
| CC 74 or 71                                                    | BRIGHT of every layer (offset on modulator output levels)                                                                                                                     | `MIDI.md:78,88–102`                  |
| CC 1, 2, 4, 10, 11, 64, 91, 120, 121, 123, pressure, bend      | as the engine's DX7 (bend ±2 fixed)                                                                                                                                           | `MIDI.md:50–64`                      |
| PC on the **scene channel** (System, off by default)           | recalls scene n+1, never reaches a part                                                                                                                                       | `MIDI.md:82,104–112`                 |
| CC 74/71/70 on the **master control channel** (off by default) | master filter cutoff, resonance, type                                                                                                                                         | `MIDI.md:86,114–128`                 |
| Song Select `F3 nn`                                            | recalls a scene, if the sealed engine passes it on (unknown on hardware)                                                                                                      | `MIDI.md:83`                         |

A channel with no part makes no sound and ignores PC (`MIDI.md:84`).

### DX7 SysEx

Owned by DX747 before the transfer protocol sees the frame (`app/transfer.c:43–45`;
`app/dx747/ctl.inc:196–244`):

- **Parameter change** `F0 43 1n gg pp dd F7`, `gg` 0 or 1, parameters 0–155 in VCED order, 155
  the operator mask; function parameters (`gg` ≥ 8) ignored; values above a parameter's limit
  clamped (`MIDI.md:134–149`; `ctl.inc:199–228,264–293`). This is exactly what the editor's
  parameter changes send.
- **Single-voice dump** `F0 43 0n 00 01 1B <155> ck F7`, 163 bytes: replaces the voice, all operators
  switched on, out-of-range bytes clamped rather than refused, a bad checksum or a byte ≥ 128
  ignored silently (`MIDI.md:151–157`; `ctl.inc:229–242,352–368`). The voice lives in the engine's
  RAM, like Official Open's track import; it is kept only when the user saves a scene. **Likely**.
- **Which layer.** Device number n means channel n+1, and the message goes to the **framed layer**
  of the part on that channel, chosen with ALGO on the Part screen (layer 1 until then), and kept
  by scenes (`MIDI.md:159–163`; `ctl.inc:250–262`; `app/dx747/parts.inc:84–96`). A channel with no
  part takes nothing, and the screen says nothing.
- **Order and limits.** Applied in arrival order, a few per control cycle; up to 64 parameter
  changes and 8 dumps wait, the rest are dropped with "DX7 SYSEX LOST" on screen. An edit after a PC
  waits 20 ms so it lands on the new voice (`MIDI.md:165–171`; `ctl.inc:40,349–377`).
- **BRIGHT and edits.** While BRIGHT is on, a level the editor sets is the voice's own level, and
  the sound plays it plus the offset (`MIDI.md:173–174`; `ctl.inc:270–278`). The editor needs no
  change for this.
- **No bank dump, no dump out.** The 4,104-byte bank dump never arrives: the transport drops frames
  over 1,024 bytes, and the mailbox holds 192 (`MIDI.md:176–178`; `transfer.c:24,46`). The unit sends
  no voice dumps (`MIDI.md:178`), so **Receive patches** has nothing to listen for.

### Against stock V16 and Official Open

|                          | Stock V16 (orange FM1)                    | Official Open (green FM1)            | DX747                                                            |
| ------------------------ | ----------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Multitimbral             | 8 Voices, channels set on the FM1         | 8 tracks on channels 1–7, 10         | up to 8 parts on any channels, layered                           |
| DX7 dump reaches         | the Voice selected on screen              | the track on the dump's channel      | the framed layer of the part on the dump's channel               |
| DX7 parameter change     | selected Voice, channel 1 or All only     | ignored                              | framed layer of the part on its channel                          |
| Bank dump over MIDI      | yes (USB)                                 | dropped                              | dropped                                                          |
| Program Change           | the Voice on the channel                  | built-in program, track's voice lost | library voice 1–128; collapses a layered part                    |
| Effect controllers       | CC 70–93, shared FX group                 | track volume/pan/mod (not FX)        | none at 70–93; CC 74/71 are BRIGHT, filter on the master channel |
| Editor's vendor protocol | `00 32` identity, object 4, object 5 read | `F0 7D 46 4D` commands 0–2, 6, 9, 22 | the same plus DX747's commands 23–31                             |

## The vendor protocol

DX747 keeps Official Open's transfer protocol, `F0 7D 'F' 'M' 02 cmd tok-lo tok-hi <packed> ck F7`,
one request at a time, a new token per request, replies only on request and only on the port that
asked (`docs/CONFIG-PROTOCOL.md:9–22`; `app/transfer.c:11–17,246–350`). The editor already speaks
it (`src/lib/official-open-transfer.ts`, `src/lib/official-open-read.ts`). Safe boot ignores all of
it (`transfer.c:42`).

### Inherited commands (`app/transfer.c:100–245`)

| Cmd                            | DX747 behaviour                                                                                                                                                                                                   | Class        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 0 info                         | same 14-byte reply; every engine reports DX7, since boot sets every track to DX7 (`app/dx747/boot.inc:24`)                                                                                                        | read         |
| 1 begin export                 | kinds 1 (an engine's voice, 156, with BRIGHT removed), 2 (an engine's timbre), 4 (a library bank, 4,096, A–D), and new kind 5 (the state image, 346)                                                              | read         |
| 2 read chunk                   | ≤ 64 bytes                                                                                                                                                                                                        | read         |
| 3, 4, 5 import                 | kind 1: an engine's voice (RAM); kind 2: a timbre, refused unless DX7; **kind 4: writes a library bank to Flash** (the ROM import, `app/fm_library.c:158–187`); kind 0/3: projects, refused (`app/project.c:423`) | write        |
| 6 cancel                       | clears the transfer                                                                                                                                                                                               | none         |
| 7, 8 project save/load         | answer empty (`project.c:421–422`)                                                                                                                                                                                | stubbed      |
| 9 slot name, 10 rename         | project names; 10 changes RAM only                                                                                                                                                                                | read / write |
| 11–16 samples                  | begin, write, finish refused (`app/samples.c:14–17`); 11, 15, 16 answer                                                                                                                                           | stubbed      |
| 17–22 statistics, capabilities | as Official Open; 22 is not extended                                                                                                                                                                              | read         |

### DX747's configuration commands (`docs/CONFIG-PROTOCOL.md:24–106`; `app/dx747/config.inc:186–253`)

| Cmd                  | What                                                                                                                                                                                                                                                                     | Touches                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 23 HELLO             | `'D' 'X' proto(1) flags engines_up parts(8) layers(8) scenes(64) 'V' '0' '1'`                                                                                                                                                                                            | read                                                                                              |
| 24 STATE_CRC         | CRC32 and size (346) of the state image                                                                                                                                                                                                                                  | read                                                                                              |
| 1/2, kind 5          | the state image: selected part, settings, filter, effects, per part channel/level/framed layer/name, per engine owner/level/pan/BRIGHT/sends/program/flags/windows/shift/fold/poly/velocity/voice name, scene revision (`CONFIG-PROTOCOL.md:86–100`; `config.inc:18–50`) | read                                                                                              |
| 25 SET_LAYER         | 15 fields of one engine's layer, including its program                                                                                                                                                                                                                   | RAM                                                                                               |
| 26 SET_PART          | part level, part **channel**                                                                                                                                                                                                                                             | RAM                                                                                               |
| 27 PART_OP           | add part, add/remove layer, select part, **select (frame) layer**                                                                                                                                                                                                        | RAM                                                                                               |
| 28 SET_MASTER        | filter, reverb, delay                                                                                                                                                                                                                                                    | RAM                                                                                               |
| 29 SET_SETTING       | scene channel, master channel, button light, Bluetooth audio in                                                                                                                                                                                                          | **Flash** (settings sector, written ~1.5 s later, `app/project.c:90–120,374–384`)                 |
| 30 SCENE op 0        | list four scenes                                                                                                                                                                                                                                                         | read                                                                                              |
| 30 SCENE op 1        | recall                                                                                                                                                                                                                                                                   | RAM, then **Flash**: a recall records the last scene in the settings sector (`project.c:136–150`) |
| 30 SCENE ops 2, 3, 4 | save, rename, delete                                                                                                                                                                                                                                                     | **Flash** (one 4 KB sector per scene)                                                             |
| 31 PART_NAME         | a part's 12-character name                                                                                                                                                                                                                                               | RAM                                                                                               |

"RAM" means the live state, lost at power-off unless a scene is saved; DX747 recalls the last scene
at power-on. **Confirmed** from source for the settings and scene paths; that 25–28 and 31 write no
Flash is **Likely** (they call no save path in `config.inc`, but the effects and sends edits go into
the sealed engine).

The storage claim (`dx_storage_claim`, which erases the stock sample bank to make room for scenes)
is never reachable from this protocol; only the panel asks for it (`CONFIG-PROTOCOL.md:83–84`;
`config.inc:166`).

### Dangerous / excluded

Under this repo's rules, none of the following may be sent by normal editor code:

- the sealed updater's frames, `F0 22 24 35 7F F7` and `F0 00 59 …`, which reboot into the updater
  (`CONFIG-PROTOCOL.md:20–21`), and every `00 32` command but the identity query;
- commands 3–5 with kind 4 (the ROM import: a library bank to Flash), as already excluded for
  Official Open;
- command 30 ops 2, 3, 4 (scene writes), command 29 (settings), and command 30 op 1 and a PC on the
  scene channel (each recall writes the settings sector) until each is approved;
- commands 7, 8, 10, 12–16 and kinds 0, 2, 3, whatever DX747 does with them today;
- the power-on chords (safe boot, `fm1_device_recovery`), which are the user's alone.

## What the editor would do with it today

Identified as Official Open (`src/lib/firmware-profile.ts:185`: `bankDumps`, `singleVoiceDumps`,
`trackEngineRead`; no `parameterChanges`, `programChanges`, or effect controllers):

- **Slot click / Send patch.** Command 0, then the dump on the note channel. Works on channels 1–7
  while a part is there (the default). On channel 8, part 8's default, the editor refuses ("reaches
  no track"). On channel 10 the editor sends and reports success, but no part is there by default,
  so nothing happens. A part moved to channel 11–16 is refused.
- **Voice editor.** Every edit goes as a whole-voice dump, which works but is heavier than the
  parameter changes DX747 takes.
- **Send to FM1 (bank).** The 4,104-byte dump is dropped by the FM1 and the editor says it was
  sent. This is the same as on Official Open today.
- **Effects, Program Change.** Nothing sent, which is right: DX747 has no effect controllers at CC
  70–93, and a PC would load a library voice the editor does not know.
- **Badge and track status.** "Official Open V747747" and Official Open's track wording, both wrong.

Nothing harmful is sent: commands 0 and the dump are as safe on DX747 as on Official Open.

## What support would take

### A `dx747` family (no new MIDI)

- `src/lib/fm1-firmware.ts`: a new `kind`, matched exactly on `FM-1_8747747` before the Official
  Open pattern; `fm1FirmwareRelease` names it from the identity (V01 cannot be read from it).
- `src/lib/firmware-profile.ts`: `parameterChanges` and `singleVoiceDumps` from release 0; no
  `bankDumps` (refused on Send, as the SMK-37's is), no `programChanges`, no `effectControllers`,
  `presetEffects`, or `sharedEffects`, no `trackEngineRead`. The single-voice dump rule in
  `AGENTS.md` ("only to M-VAVE's") needs a DX747 entry: the dump is an unsaved RAM edit there, as it
  is on M-VAVE's firmware.
- A `selectedVoiceEdits`-style notice, worded for DX747: the editor's sends reach the **framed
  layer** of the part on the note channel, and nothing when no part has that channel.
- The badge, the firmware setting, the bank instructions (bank import is the DX747 workbench's job),
  the analytics family `dx747`, and every locale.
- The device stays the FM1 (`fm1Device` reads the model before the underscore). DX747 is FM1-only
  today; an SMK-37 port would keep its model and number, as Skiff does.

Entry cost is a family, a few strings, and a profile entry, roughly what the SMK-37's family cost
(about 400 B); measure with `npm run bundle:check`.

### A Parts view (needs approvals, in stages)

This is what the parked V16 Voice strip lacked: DX747 lets the editor read every part's channel and
layers, and set them, over MIDI.

1. **Read only**: HELLO (23), STATE_CRC (24), the state image (1/2 kind 5), the scene list (30 op 0),
   and the library bank read (1/2 kind 4, already approved for Official Open). The editor could show
   the eight parts with their channels and layers, pick a part to edit by setting the note channel,
   and read DX747's 128 library voices into a bank (a receive path, since the unit sends no dumps).
   The author's own page polls 24 every 400 ms (`CONFIG-PROTOCOL.md:102–106`); the editor would
   poll quietly, as the audition phrase sends quietly, or read on demand, and never while a transfer
   is running.
2. **RAM writes**: frame a layer (27 op 4), select a part (27 op 3), set a part's channel (26 field
   1), a layer's program (25 field 14), name a part (31). Framing a layer is what lets the voice
   editor edit any layer of a layered part.
3. Layer ranges, mixes, the master filter and effects (25, 28), and part/layer add/remove (27 ops
   0–2), only if the editor should become a DX747 configurator, which the author's workbench already
   is.
4. Flash: scenes and settings. Not recommended; the panel and DX747's workbench own them.

Each stage needs the owner's approval recorded under MIDI in `AGENTS.md`, its frames tested against
fixtures, and a hardware run.

### Paths that would work unchanged

The DX7 voice codec, parameter changes, single-voice dumps, the MIDI panic (Note Offs on the note
channel), the keyboard and audition phrases (notes on a part's channel), the MIDI log, and every
file import/export. Not useful: **Receive patches** (no dumps out), bank send (dropped), Program
Change (library voices unknown to the editor), the V16 Effects view (no shared FX group at CC
70–93).

## Risks and unknowns

- **Beta firmware.** v0.1, one unit flashed by its author; eight engines together never measured on
  hardware (`ON-DEVICE-CHECKLIST.md:50–52`). Expect identity, protocol, and behaviour to move.
- **Installing it costs Official Open's data.** DX747 replaces Official Open; it refuses projects
  and samples, and the first scene save erases the stock sample bank (`DX747.md:211–221`). Back up
  projects, samples, and voice banks with M-VAVE's workbench first. The way back is the author's
  **Restore original V15**, then reinstalling Official Open.
- **Identity per release.** Unknown how later releases name themselves.
- **Framed layer.** A dump to a layered part replaces only the framed layer, which the editor cannot
  see without the state image.
- **BRIGHT.** Exported voices have BRIGHT removed (`transfer.c:184–186`), but a held note may or may
  not follow BRIGHT (`MIDI.md:101–102`).
- **SysEx overflow.** More than 64 parameter changes or 8 dumps queued are dropped; the editor's
  sends are paced, but a randomise sent as parameter changes is 155 at once. Send a whole-voice
  change as one dump.
- **Polling cost.** The state image is six reads every time it changes; the MIDI log must not drown.

## Hardware runs needed

On the green FM1 if Ben chooses to move it from Official Open to DX747 (orange stays on stock V16
for the V16 work), after backing up Official Open's projects, samples, and banks:

1. The identity query: `FM-1_8747747`, and nothing else sent.
2. A dump on channels 1, 8, and 10 with the default parts: lands on parts 1 and 8; nothing on 10.
3. One parameter change on channel 1 (algorithm), and on a layered part with layer 2 framed: only
   layer 2 changes (`ON-DEVICE-CHECKLIST.md:88–90` asks the same).
4. The voice editor live on a part moved to channel 12.
5. Later, once approved: HELLO, STATE_CRC, the state image, and a library bank read, compared with
   the screen.

Record each in `docs/hardware-runs/` and the findings in `docs/fm1-research.md`.

## Recommended plan

1. **Now (no MIDI, small)**: add the `dx747` family and profile so the editor stops treating DX747
   as Official Open: parameter changes and dumps on any channel, bank send refused, a one-line
   framed-layer notice, correct badge. Ship behind the identity match only; it changes nothing for
   any other firmware. Fixtures from the identity string; no hardware needed to build it, but run 1–4
   above before announcing it.
2. **Then**: ask the owner to approve the read-only commands (23, 24, kind 5, scene list op 0, kind 4
   read) for DX747, and build a read-only Parts strip from the state image.
3. **Then**: approve framing a layer and setting a part's channel (27 op 4, 26 field 1), which make
   the strip useful for editing layered parts and placing parts on channels.
4. Leave scenes, settings, and the ROM import to the panel and DX747's own workbench.

No OTA, loader, or Flash path is involved in steps 1–3.
