// Steps 3 and 4 of stock-v16-run-sheet.md as one timed sweep. Run it from Chrome's console on the
// dev server's page:
//
//   await import('/docs/hardware-runs/stock-v16-sweep.js')
//
// It holds middle C on the note channel, sends each Control Change below on the FX channel about
// three seconds apart, and shows what the FM1's FX page should show. Watch the FM1 and note only
// what differs. Space pauses or resumes, the left arrow sends the previous step again, and Escape
// stops. At the end it releases the note and downloads every message sent and received as JSON.
//
// It sends nothing but these Control Changes and one note: no SysEx, so nothing reaches the
// updater, the loader, or Flash.

const fxChannel = 2
const noteChannel = 1
const stepMs = 3000

const parameters = [
  ['Filter', 'switch', 'Type', 'Cutoff', 'Q'],
  ['Reverb', 'switch', 'Type', 'Decay', 'Mix'],
  ['Delay', 'switch', 'Decay', 'Rate', 'Mix'],
  ['Distortion', 'switch', 'Gain', 'Tone', 'Level'],
  ['Chorus', 'switch', 'Freq', 'Depth', 'Mix'],
  ['Phaser', 'switch', 'Freq', 'Depth', 'Mix'],
]
const lastType = { Filter: 'High Pass', Reverb: 'Plate' }

/** What CC `70 + index` at 127 should show, from the firmware: V15's limits, clamped. */
function expectAt127(index) {
  const [effect, ...names] = parameters[index >> 2]
  const parameter = index & 3
  if (parameter === 0) return `${effect} On`
  if (parameter === 1 && lastType[effect]) return `${effect} Type: ${lastType[effect]}`
  if (effect === 'Filter' && parameter === 2) return 'Filter Cutoff: 107'
  if (effect === 'Filter' && parameter === 3) return 'Filter Q: 10'
  return `${effect} ${names[parameter]} (guide's name): 100`
}

const steps = [
  ...Array.from({ length: 24 }, (_, index) => ({
    part: 'A',
    controller: 70 + index,
    value: 127,
    expect: `${expectAt127(index)}, and the FX page shows it`,
  })),
  { part: 'B', controller: 71, value: 0, expect: 'Filter Type: Low Pass' },
  { part: 'B', controller: 71, value: 1, expect: 'Filter Type: Band Pass' },
  { part: 'B', controller: 71, value: 2, expect: 'Filter Type: High Pass' },
  { part: 'B', controller: 74, value: 0, expect: 'Reverb Off' },
  { part: 'B', controller: 74, value: 1, expect: 'Reverb On (any value but 0)' },
  { part: 'B', controller: 72, value: 64, expect: 'Filter Cutoff: 64' },
  { part: 'C', controller: 94, value: 1, expect: 'Nothing changes' },
  { part: 'C', controller: 95, value: 1, expect: 'Nothing changes' },
  { part: 'C', controller: 1, value: 127, expect: 'No effect changes (V15’s Filter Type)' },
  { part: 'C', controller: 1, value: 0, expect: 'No effect changes; modulation back off' },
  { part: 'C', controller: 7, value: 0, expect: 'No effect changes; volume may drop' },
  { part: 'C', controller: 7, value: 127, expect: 'No effect changes; volume back' },
  { part: 'C', controller: 11, value: 0, expect: 'No effect changes; expression may drop' },
  { part: 'C', controller: 11, value: 127, expect: 'No effect changes; expression back' },
]

const access = await navigator.requestMIDIAccess({ sysex: false })
const isFm1 = (port) => /fm.?1|usb composite/i.test(port.name)
const output = [...access.outputs.values()].find(isFm1)
const input = [...access.inputs.values()].find(isFm1)
if (!output) {
  throw new Error(
    `No FM1 output. Outputs: ${[...access.outputs.values()].map((p) => p.name).join(', ')}`,
  )
}

const start = performance.now()
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
const record = []
const send = (bytes, note) => {
  output.send(bytes)
  record.push({ at: Math.round(performance.now() - start), dir: 'out', hex: hex(bytes), note })
}
const hear = (event) =>
  record.push({ at: Math.round(performance.now() - start), dir: 'in', hex: hex(event.data) })
input?.addEventListener('midimessage', hear)

const banner = document.createElement('div')
banner.style.cssText =
  'position:fixed;inset:auto 16px 16px 16px;z-index:99999;padding:16px 20px;font:600 22px/1.35 system-ui;background:#111;color:#ffd166;border:3px solid #ffd166;box-shadow:6px 6px 0 #000'
document.body.append(banner)

// The key handler changes these while the loop waits, so they live on one object the loop reads.
const run = { index: 0, paused: false, stopped: false }
let wake = () => {}
const onKey = (event) => {
  if (event.key === ' ') run.paused = !run.paused
  else if (event.key === 'ArrowLeft') run.index = Math.max(0, run.index - 2)
  else if (event.key === 'Escape') run.stopped = true
  else return
  // The editor has shortcuts of its own, so the sweep keeps these keys to itself.
  event.preventDefault()
  event.stopImmediatePropagation()
  wake()
}
window.addEventListener('keydown', onKey, true)
const wait = (ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    wake = () => {
      clearTimeout(timer)
      resolve()
    }
  })

const noteOn = [0x90 | (noteChannel - 1), 60, 90]
const noteOff = [0x80 | (noteChannel - 1), 60, 0]
send(noteOn, 'hold middle C')

try {
  while (run.index < steps.length && !run.stopped) {
    if (run.paused) {
      banner.textContent = `Paused at ${run.index + 1} of ${steps.length}. Space resumes.`
      await wait(60_000)
      continue
    }
    const step = steps[run.index]
    const bytes = [0xb0 | (fxChannel - 1), step.controller, step.value]
    send(bytes, step.expect)
    banner.innerHTML = `<div style="font-size:15px;color:#bbb">Part ${step.part} · ${run.index + 1} of ${steps.length} · Space pauses · ← repeats · Esc stops</div>CC ${step.controller} = ${step.value} on ch ${fxChannel}<br><span style="color:#fff">Expect: ${step.expect}</span>`
    run.index += 1
    await wait(stepMs)
  }
} finally {
  send(noteOff, 'release middle C')
  input?.removeEventListener('midimessage', hear)
  window.removeEventListener('keydown', onKey, true)
  banner.textContent = run.stopped ? 'Stopped. Log downloaded.' : 'Done. Log downloaded.'
  setTimeout(() => banner.remove(), 5000)
  const file = new Blob(
    [JSON.stringify({ output: output.name, input: input?.name ?? null, record }, null, 2)],
    { type: 'application/json' },
  )
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = `stock-v16-sweep-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  link.click()
}
