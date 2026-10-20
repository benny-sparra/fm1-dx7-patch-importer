# Official Open V14: reading voices, sounds, and banks, 2026-10-20

Run on 2026-10-20 on the orange FM1 (V14), from Chrome on macOS, through the dev server. The procedure for the first run of the read commands approved on 2026-10-20
(`AGENTS.md`, MIDI): command 1 for a track's DX7 voice (kind 1), a track's sound (kind 2), and a DX7
bank of the library (kind 4), command 2 for their chunks, command 6, command 9, and command 22. Every
one reads and changes nothing on the FM1. The capture is
`official-open-v14-reads-capture-2026-10-20.json` beside this note; the results are below.

## Running it

1. Quit anything else using the FM1's MIDI, and close the editor's tab: the FM1 handles one SysEx
   message at a time and drops one that arrives while another waits.
2. Start the dev server (`npm run dev`) and open `https://127.0.0.1:5174/firmware/` in Chrome. That
   page has no MIDI code of its own, so nothing else talks to the FM1.
3. In its console (allow MIDI and SysEx when asked), paste the snippet below (it is a block, so it can be pasted again; reload the page first if a paste stopped part-way). It reads, in this
   order: command 22; command 0; the names of slots 0 to 15; each track's sound; the voice of every
   DX7 track; and the four banks. It then downloads the captures as a JSON file.
4. Move the downloaded `official-open-v14-reads-capture-2026-10-20.json` beside this note.

```js
{
  const read = await import('/src/lib/official-open-read.ts')
  const send = await import('/src/lib/official-open-track-send.ts')
  console.log('Asking for MIDI access (allow it in the bar at the top of the window)…')
  const access = await navigator.requestMIDIAccess({ sysex: true })
  console.log('MIDI access granted')
  const named = (ports) => [...ports.values()].find((port) => /fm.?1/i.test(port.name))
  const output = named(access.outputs)
  const input = named(access.inputs)
  if (!output || !input) {
    throw new Error(
      `No FM1 port found. Outputs: ${[...access.outputs.values()].map((p) => p.name)}`,
    )
  }
  console.log('Using', input.name, '/', output.name)
  const link = {
    listen: (hear) => {
      const handle = (event) => hear(Array.from(event.data))
      input.addEventListener('midimessage', handle)
      return () => input.removeEventListener('midimessage', handle)
    },
    send: (message) => output.send(message),
  }
  let token = 100 + Math.floor(Math.random() * 8000)
  const options = { takeToken: () => (token = (token % 0x3fff) + 1) }
  const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const captures = []
  const keep = (what, bytes) =>
    captures.push({
      what,
      bytes: bytes.length,
      crc32: read.officialOpenCrc32(bytes).toString(16),
      hex: hex(bytes),
    })
  const attempt = async (what, job) => {
    console.log('Reading', what)
    try {
      return await job()
    } catch (error) {
      captures.push({ what, error: String(error.problem ?? error), status: error.status })
    }
  }
  const capabilities = await attempt('command 22', () =>
    read.readOfficialOpenCapabilities(link, options),
  )
  console.log('Reading the track engines')
  const info = await send.readOfficialOpenInfo(link, options.takeToken())
  const names = []
  for (let slot = 0; slot < 16; slot += 1) {
    names.push(
      await attempt(`slot ${slot} name`, () => read.readOfficialOpenSlotName(link, slot, options)),
    )
  }
  for (let target = 0; target < 8; target += 1) {
    const bytes = await attempt(`sound, track ${target + 1}`, () =>
      read.readOfficialOpenExport(link, { ...options, kind: 'sound', target }),
    )
    if (bytes) keep(`sound, track ${target + 1}, ${info.engines[target]}`, bytes)
  }
  for (let target = 0; target < 8; target += 1) {
    if (info.engines[target] !== 'dx7') continue
    const bytes = await attempt(`voice, track ${target + 1}`, () =>
      read.readOfficialOpenExport(link, { ...options, kind: 'voice', target }),
    )
    if (bytes) keep(`voice, track ${target + 1}`, bytes)
  }
  for (let target = 0; target < 4; target += 1) {
    const bytes = await attempt(`bank ${target}`, () =>
      read.readOfficialOpenExport(link, { ...options, kind: 'bank', target }),
    )
    if (bytes) keep(`bank ${target}`, bytes)
  }
  const result = JSON.stringify({ capabilities, info, names, captures }, null, 1)
  const link2 = document.createElement('a')
  link2.href = URL.createObjectURL(new Blob([result], { type: 'application/json' }))
  link2.download = 'official-open-v14-reads-capture-2026-10-20.json'
  link2.click()
  console.log('Done: the capture was downloaded as', link2.download)
}
```

## What to check in the results

- **Command 22** answers with 128 programs, 4 banks, the library available, and feature bits `3`.
  A V13 or earlier FM1 refuses it, which the snippet records as an error.
- **Command 9**: each slot's name as the FM1's screen shows it.
- **Kind 2**: 223 bytes whose header names the engine of the track it was read from (byte 0 `type`,
  `docs/fm1-research.md`, "Official Open: track preset"); the 303 on track 2 is the first to compare
  with the research map.
- **Kind 1**: 156 bytes for a DX7 track, whose voice name should match the track's.
- **Kind 4**: 4096 bytes, 32 voices of 128; the first voice's name should match the FM1's first
  library voice, and a bank should open in the editor's DX7 bank import as a standard dump would.
- Every read must leave the FM1 as it was: nothing changed on screen, no project marked edited.

## Results

Tracks 1 and 4 run DX7, track 2 runs 303, track 3 runs SAMPLER, and tracks 5 to 8 run PSG. Every
read answered at once; none was refused except the empty slots below.

| Read                               | Result                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command 22                         | 128 programs, 4 banks, the library available, a sample bank limit of 446,464 bytes (`GROOVE_SAMPLE_LIMIT`, as the source gives it), features `3`, version 1. **Confirmed**                                                               |
| Command 0                          | As on V12 and V13: format 4, 16 slots, current slot 0, project size 4064, internal clock, and the engines above                                                                                                                          |
| Command 9                          | Slot 0 is `METRO FUNK`. Slots 1 to 15, which nothing was saved to, answer **status 1** and no name, which `readOfficialOpenSlotName` now reads as null. **Confirmed**                                                                    |
| Kind 2 (a track's sound)           | 223 bytes for every engine, as mapped. Byte 0 is the engine (0 DX7, 1 303, 3 PSG, 5 SAMPLER), byte 1 the level, the last three bytes the sends, the loop length, and the pad count (8 for SAMPLER only). **Confirmed** for these engines |
| Kind 1 (a track's DX7 voice)       | 156 bytes, identical to bytes 11 to 166 of the same track's kind 2 sound, with the name in bytes 145 to 154 (`DRY CLAV` on track 1, `SOFT BRASS` on track 4) and 63 in byte 155. **Confirmed**                                           |
| Kind 4 (a DX7 bank of the library) | 4096 bytes, 32 standard 128-byte voices each, every byte 7-bit, the name in bytes 118 to 127 of each. Banks 0 to 3 hold the 128 library voices (PIANO 1 first, then GUITAR 1, BRASS 1, and BOWOAN). **Confirmed**                        |

- **303 on track 2** (`data[0..11]`): Cutoff 45, Reso 24, EnvMod 32, Decay 52, Accent 62, Wave 0, Tune
  64, Volume 96, Drive 0, DrvTyp 1, Slide 14, AccDec 5. The order, and Tune at 64, match the research
  map.
- **PSG** (tracks 5 to 8, identical): Mode 0, Noise 16, Tune 24, Release 38. Noise and Tune are the
  defaults the notes give.
- **SAMPLER** (track 3): `data` is eight pads of six bytes (for the first, 105, 24, 127, 0, 1, 12),
  and the pad count is 8.
- **DX7 sound** (tracks 1 and 4): `data` starts with the 156-byte voice, so a track's voice is also
  inside its sound; the program bytes are 7 and 11 and the `modified` flag 0.

Not checked: that the FM1's screen was unchanged afterwards (the user did not say), and a kind 2
read of a 808 or Pluck track, since none ran.
