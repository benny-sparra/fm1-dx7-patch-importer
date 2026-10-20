# Official Open V14: reading voices, sounds, and banks, 2026-10-20

**Not run yet.** The procedure for the first run of the read commands approved on 2026-10-20
(`AGENTS.md`, MIDI): command 1 for a track's DX7 voice (kind 1), a track's sound (kind 2), and a DX7
bank of the library (kind 4), command 2 for their chunks, command 6, command 9, and command 22. Every
one reads and changes nothing on the FM1. Results go below, with the capture file beside this note.

## Running it

1. Quit anything else using the FM1's MIDI, and close the editor's tab: the FM1 handles one SysEx
   message at a time and drops one that arrives while another waits.
2. Start the dev server (`npm run dev`) and open `https://127.0.0.1:5174/firmware/` in Chrome. That
   page has no MIDI code of its own, so nothing else talks to the FM1.
3. In its console (allow MIDI and SysEx when asked), paste the snippet below. It reads, in this
   order: command 22; command 0; the names of slots 0 to 15; each track's sound; the voice of every
   DX7 track; and the four banks. It then copies the captures as JSON to the clipboard.
4. Save the JSON as `official-open-v14-reads-capture-2026-10-20.json` beside this note.

```js
const read = await import('/src/lib/official-open-read.ts')
const send = await import('/src/lib/official-open-track-send.ts')
const access = await navigator.requestMIDIAccess({ sysex: true })
const named = (ports) => [...ports.values()].find((port) => /fm.?1/i.test(port.name))
const output = named(access.outputs)
const input = named(access.inputs)
if (!output || !input) throw new Error('No FM1 port found')
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
  try {
    return await job()
  } catch (error) {
    captures.push({ what, error: String(error.problem ?? error), status: error.status })
  }
}
const capabilities = await attempt('command 22', () =>
  read.readOfficialOpenCapabilities(link, options),
)
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
console.log(result)
copy(result)
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

Pending.
