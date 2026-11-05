# Official Open Phase 1: run sheet for the green FM1

Not run yet. For [Phase 1](../official-open-plan.md) as [planned](../official-open-phase1-plan.md):
it repeats the reads of
[the V14 run](official-open-v14-reads-2026-10-20.md) on the green FM1, which runs Official Open
since 2026-11-03, and answers what that run left open. Every message is one approved in `AGENTS.md`
on 2026-10-20 (commands 0, 1 with kinds 1, 2, and 4, 2, 6, 9, and 22). None writes, saves, or
loads anything on the FM1; nothing here touches OTA, the loader, or Flash writes. The only change
on the FM1 is the one edit Ben makes on its panel in step 4, which he discards.

## Before starting

- In the editor, connect MIDI and note the badge's firmware name (for example Official Open V14),
  then **close the editor's tab**: the FM1 takes one SysEx message at a time.
- On the FM1, open a project whose **track 1 runs DX7** and whose tracks between them run **808**
  and **PLUCK** (the V14 run read neither). If no saved or factory project has both, set two tracks
  to them on the FM1 and do not save; changing a track's engine can clear its steps.
- Note each track's engine and, for DX7 tracks, the voice name on the screen.
- Quit any other app using the FM1's MIDI. Start the dev server (`npm run dev`) and open
  `https://127.0.0.1:5174/firmware/` in Chrome, which has no MIDI code of its own.

## Setup (paste once into the console)

Allow MIDI and SysEx when asked. It lists the ports, records every message sent and received with
its time, and defines `oo` for the steps. Tokens are fixed per step, so the bytes below are exactly
what is sent unless the FM1 misses a reply and the same request goes again (up to three times).

```js
{
  const read = await import('/src/lib/official-open-read.ts')
  const transfer = await import('/src/lib/official-open-transfer.ts')
  const access = await navigator.requestMIDIAccess({ sysex: true })
  const names = (map) => [...map.values()].map((port) => port.name)
  console.log('Outputs:', names(access.outputs), 'Inputs:', names(access.inputs))
  const named = (map) => [...map.values()].find((port) => /fm.?1/i.test(port.name))
  const output = named(access.outputs)
  const input = named(access.inputs)
  if (!output || !input) throw new Error('No FM1 port found: note the names above in the results.')
  const hex = (bytes) =>
    Array.from(bytes, (byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ')
  const started = performance.now()
  const stamp = () => Math.round(performance.now() - started)
  const log = []
  const results = []
  input.addEventListener('midimessage', (event) => log.push({ ms: stamp(), in: hex(event.data) }))
  const link = {
    listen: (hear) => {
      const handle = (event) => hear(Array.from(event.data))
      input.addEventListener('midimessage', handle)
      return () => input.removeEventListener('midimessage', handle)
    },
    send: (message) => {
      log.push({ ms: stamp(), out: hex(message) })
      output.send(message)
    },
  }
  const tokens = (first) => {
    let next = first
    return () => next++
  }
  const note = (step, what, outcome) => {
    results.push({ step, what, ms: stamp(), ...outcome })
    console.log(step, what, outcome)
  }
  const failure = (error) => ({ error: String(error.problem ?? error), status: error.status })
  const exportRead = async (step, what, kind, target, first) => {
    try {
      const bytes = await read.readOfficialOpenExport(link, {
        kind,
        target,
        takeToken: tokens(first),
      })
      const crc32 = read.officialOpenCrc32(bytes).toString(16)
      note(step, what, { bytes: bytes.length, crc32, hex: hex(bytes) })
    } catch (error) {
      note(step, what, failure(error))
    }
  }
  const raw = async (step, what, request, waitMs = 1500) => {
    const token = request[6] | (request[7] << 7)
    const replies = []
    const stop = link.listen((message) => {
      const reply = transfer.parseOfficialOpenReply(message, token, request[5])
      if (reply) replies.push(reply)
    })
    link.send(request)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    stop()
    note(step, what, { request: hex(request), replies })
  }
  const save = (name) => {
    const body = JSON.stringify({ input: input.name, output: output.name, results, log }, null, 1)
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
    anchor.download = name
    anchor.click()
  }
  window.oo = { exportRead, failure, link, note, raw, read, save, tokens, transfer }
  console.log('Ready: using', input.name, '/', output.name)
}
```

## Steps

Paste each block after the one before has printed its results. Tick what the screen shows.

### 1. Capabilities, engines, and slot names

```js
{
  try {
    oo.note(
      1,
      'command 22',
      await oo.read.readOfficialOpenCapabilities(oo.link, { takeToken: oo.tokens(0x1100) }),
    )
  } catch (error) {
    oo.note(1, 'command 22', oo.failure(error))
  }
  await oo.raw(1, 'command 0', oo.transfer.makeOfficialOpenInfoRequest(0x1101))
  for (let slot = 0; slot < 16; slot += 1) {
    try {
      const name = await oo.read.readOfficialOpenSlotName(oo.link, slot, {
        takeToken: oo.tokens(0x1110 + slot),
      })
      oo.note(1, `slot ${slot + 1} name`, { name })
    } catch (error) {
      oo.note(1, `slot ${slot + 1} name`, oo.failure(error))
    }
  }
}
```

| Message           | Bytes                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Command 22        | `F0 7D 46 4D 02 16 00 22 36 F7`                                    |
| Command 0         | `F0 7D 46 4D 02 00 01 22 4B F7`                                    |
| Command 9, slot 1 | `F0 7D 46 4D 02 09 10 22 00 00 33 F7`                              |
| … slot 16         | `F0 7D 46 4D 02 09 1F 22 0F 00 15 F7` (token and slot rise by one) |

Expect: 128 programs, 4 banks, features `3`; the engines as noted; saved slots' names, empty ones
refused with status 1.

### 2. Every track's sound (kind 2)

```js
{
  for (let track = 0; track < 8; track += 1) {
    await oo.exportRead(2, `sound, track ${track + 1}`, 'sound', track, 0x1200 + track * 8)
  }
}
```

Six messages per track; track 1's are below. Each later track adds 8 to the token (byte 6) and
its number less one to the target, `F0 7D 46 4D 02 01 38 24 02 0E 00 01 F7` for track 8.

| Message             | Bytes                                       |
| ------------------- | ------------------------------------------- |
| Begin, kind 2       | `F0 7D 46 4D 02 01 00 24 02 00 00 47 F7`    |
| Chunk 0, 64 bytes   | `F0 7D 46 4D 02 02 01 24 00 00 00 02 45 F7` |
| Chunk 64, 64 bytes  | `F0 7D 46 4D 02 02 02 24 40 00 00 02 04 F7` |
| Chunk 128, 64 bytes | `F0 7D 46 4D 02 02 03 24 00 01 00 02 42 F7` |
| Chunk 192, 31 bytes | `F0 7D 46 4D 02 02 04 24 40 01 7C 00 07 F7` |
| Cancel (command 6)  | `F0 7D 46 4D 02 06 05 24 3F F7`             |

Expect: 223 bytes each, byte 0 the track's engine (2 for 808, 4 for PLUCK), byte 222 8 only on
SAMPLER.

### 3. Every track's voice (kind 1), DX7 or not

```js
{
  for (let track = 0; track < 8; track += 1) {
    await oo.exportRead(3, `voice, track ${track + 1}`, 'voice', track, 0x1300 + track * 8)
  }
}
```

| Message (track 1)   | Bytes                                       |
| ------------------- | ------------------------------------------- |
| Begin, kind 1       | `F0 7D 46 4D 02 01 00 26 01 00 00 46 F7`    |
| Chunk 0, 64 bytes   | `F0 7D 46 4D 02 02 01 26 00 00 00 02 43 F7` |
| Chunk 64, 64 bytes  | `F0 7D 46 4D 02 02 02 26 40 00 00 02 02 F7` |
| Chunk 128, 28 bytes | `F0 7D 46 4D 02 02 03 26 00 01 70 00 52 F7` |
| Cancel              | `F0 7D 46 4D 02 06 04 26 3E F7`             |

Track 8 begins `F0 7D 46 4D 02 01 38 26 01 0E 00 00 F7`. Expect: 156 bytes on a DX7 track, named
as on the screen. **New:** what a track on another engine answers (a refusal and its status, or
bytes).

### 4. Unsaved edits

On the FM1, change one thing on track 1's DX7 voice that is easy to see in the bytes, such as its
algorithm, and **do not save**. Note the old and new values. Then:

```js
{
  await oo.exportRead(4, 'voice, track 1, edited', 'voice', 0, 0x1400)
  await oo.exportRead(4, 'sound, track 1, edited', 'sound', 0, 0x1408)
}
```

| Message                | Bytes                                     |
| ---------------------- | ----------------------------------------- |
| Begin, kind 1, track 1 | `F0 7D 46 4D 02 01 00 28 01 00 00 44 F7`  |
| Chunks 0, 64, 128      | tokens `01`–`03` after `28`, as in step 3 |
| Cancel                 | `F0 7D 46 4D 02 06 04 28 3C F7`           |
| Begin, kind 2, track 1 | `F0 7D 46 4D 02 01 08 28 02 00 00 3B F7`  |
| Chunks 0, 64, 128, 192 | tokens `09`–`0C` after `28`, as in step 2 |
| Cancel                 | `F0 7D 46 4D 02 06 0D 28 33 F7`           |

Expect, to confirm: the voice shows the edit, and the sound's byte 3 (`modified`) is 1. Afterwards
put the edit back on the FM1, or reload the project without saving.

### 5. The four library banks (kind 4)

Before pasting, note the names of programs 1, 32, 33, 64, 65, 96, 97, and 128 on the FM1's DX7
program list (Quick Edit shows `/128`).

```js
{
  for (let bank = 0; bank < 4; bank += 1) {
    await oo.exportRead(5, `bank ${bank + 1}`, 'bank', bank, 0x1500 + bank * 0x80)
  }
}
```

66 messages per bank: begin, chunks at offsets 0 to 4032 in steps of 64 with the token rising by
one, and cancel.

| Message (bank 1)      | Bytes                                       |
| --------------------- | ------------------------------------------- |
| Begin, kind 4         | `F0 7D 46 4D 02 01 00 2A 04 00 00 3F F7`    |
| Chunk 0               | `F0 7D 46 4D 02 02 01 2A 00 00 00 02 3F F7` |
| Chunk 64              | `F0 7D 46 4D 02 02 02 2A 40 00 00 02 7E F7` |
| Chunk 4032 (the 64th) | `F0 7D 46 4D 02 02 40 2A 40 1F 00 02 21 F7` |
| Cancel                | `F0 7D 46 4D 02 06 41 2A 7D F7`             |

Bank 4 begins `F0 7D 46 4D 02 01 00 2D 04 06 00 36 F7` and cancels with
`F0 7D 46 4D 02 06 41 2D 7A F7`. Expect: 4096 bytes each, and voice 1 and 32 of each bank named as
the programs noted (bank 1 voice 1 is program 1). Note also whether any bank holds voices saved on
this FM1, or all are the factory set.

### 6. Reading while the sequencer plays

Start the project playing, with something sustained on a DX7 track. Then paste and listen:

```js
await oo.exportRead(6, 'bank 1 while playing', 'bank', 0, 0x1600)
```

Bytes as step 5's bank 1 with `2C` in place of `2A`: begin `F0 7D 46 4D 02 01 00 2C 04 00 00 3D F7`,
cancel `F0 7D 46 4D 02 06 41 2C 7B F7`. Expect, to confirm: no stutter, drift, or stuck note, and the
same bytes as step 5. Stop playback.

### 7. An abandoned transfer

```js
{
  const {
    makeOfficialOpenBeginExportRequest: begin,
    makeOfficialOpenReadChunkRequest: chunk,
    makeOfficialOpenCancelRequest: cancel,
  } = oo.read
  await oo.raw(7, 'begin bank 1', begin(0x1700, 'bank', 0))
  await oo.raw(7, 'chunk 0', chunk(0x1701, 0, 64))
  await oo.raw(7, 'chunk 64', chunk(0x1702, 64, 64))
  await oo.raw(7, 'begin voice while bank open', begin(0x1703, 'voice', 0))
  await oo.raw(7, 'cancel', cancel(0x1704))
  await oo.exportRead(7, 'voice after cancel', 'voice', 0, 0x1705)
  await oo.raw(7, 'begin bank 1, left open', begin(0x1710, 'bank', 0))
  await new Promise((resolve) => setTimeout(resolve, 11000))
  await oo.exportRead(7, 'voice 11 s later', 'voice', 0, 0x1711)
}
```

| Message                         | Bytes                                                    |
| ------------------------------- | -------------------------------------------------------- |
| Begin bank 1                    | `F0 7D 46 4D 02 01 00 2E 04 00 00 3B F7`                 |
| Chunk 0                         | `F0 7D 46 4D 02 02 01 2E 00 00 00 02 3B F7`              |
| Chunk 64                        | `F0 7D 46 4D 02 02 02 2E 40 00 00 02 7A F7`              |
| Begin voice, track 1, bank open | `F0 7D 46 4D 02 01 03 2E 01 00 00 3B F7`                 |
| Cancel                          | `F0 7D 46 4D 02 06 04 2E 36 F7`                          |
| Voice read (begin)              | `F0 7D 46 4D 02 01 05 2E 01 00 00 39 F7`                 |
| Its chunks 0, 64, 128           | tokens `06`–`08` after `2E`                              |
| Its cancel                      | `F0 7D 46 4D 02 06 09 2E 31 F7`                          |
| Begin bank 1, left open         | `F0 7D 46 4D 02 01 10 2E 04 00 00 2B F7`                 |
| After 11 s, begin voice         | `F0 7D 46 4D 02 01 11 2E 01 00 00 2D F7`                 |
| Its chunks, then cancel         | tokens `12`–`14`, cancel `F0 7D 46 4D 02 06 15 2E 25 F7` |

To learn: whether a begin while another export is open is refused (and with which status) or
replaces it; that command 6 frees it; and that the FM1 frees an abandoned export after 10 s.

### 8. Check and save

On the FM1: the project is not marked edited apart from step 4's own edit, the screen is as it
was, and the tracks play as before. Then:

```js
oo.save('official-open-green-reads-capture-2026-11-XX.json')
```

Move the file beside this sheet with the date filled in, and write the results below.

## Results

Not run yet.

## Acceptance run (after the code is written)

Short, in the editor itself with the fake-free build, once the plan's steps 2–4 are done:

1. With MIDI online on the green FM1, **Receive from the FM1…** offers the Official Open sources.
2. Read track 1's voice into a slot holding a patch; it plays as on the FM1; Undo puts the patch back.
3. Read library bank 1 into an empty bank; voice names match the FM1's programs 1–32.
4. Read all four library banks; four new banks appear, in the FM1's program order.
5. Unplug the FM1 during a bank read; the wizard says so in translated text, and reading again
   after reconnecting works.
6. The MIDI log shows each read's begin and one line for its result, not every chunk.
