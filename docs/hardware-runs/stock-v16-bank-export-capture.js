// Step 7 of stock-v16-run-sheet.md: records what the FM1 sends during Bank Export. Run it from
// Chrome's console on the dev server's firmware page, which has no MIDI code of its own:
//
//   await import('/docs/hardware-runs/stock-v16-bank-export-capture.js')
//
// It sends nothing. It listens for 90 seconds, shows a count of what has arrived, and then
// downloads every message as JSON. Start Bank Export on the FM1 while it listens.

const listenMs = 90_000

const access = await navigator.requestMIDIAccess({ sysex: true })
const input = [...access.inputs.values()].find((port) => /fm.?1|usb composite/i.test(port.name))
if (!input) {
  throw new Error(
    `No FM1 input. Inputs: ${[...access.inputs.values()].map((p) => p.name).join(', ')}`,
  )
}

const banner = document.createElement('div')
banner.style.cssText =
  'position:fixed;inset:auto 16px 16px 16px;z-index:99999;padding:16px 20px;font:600 22px/1.35 system-ui;background:#111;color:#ffd166;border:3px solid #ffd166;box-shadow:6px 6px 0 #000'
document.body.append(banner)

const start = performance.now()
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
const messages = []
let total = 0
const show = () => {
  const left = Math.max(0, Math.ceil((listenMs - (performance.now() - start)) / 1000))
  banner.textContent = `Listening on ${input.name}: ${left} s left. Start Bank Export on the FM1. Heard ${messages.length} messages, ${total} bytes.`
}
const hear = (event) => {
  messages.push({
    at: Math.round(performance.now() - start),
    bytes: event.data.length,
    hex: hex(event.data),
  })
  total += event.data.length
  show()
}
input.addEventListener('midimessage', hear)
const ticker = setInterval(show, 1000)
show()
await new Promise((resolve) => setTimeout(resolve, listenMs))
clearInterval(ticker)
input.removeEventListener('midimessage', hear)

banner.textContent = `Done: ${messages.length} messages, ${total} bytes. Log downloaded.`
setTimeout(() => banner.remove(), 8000)
const file = new Blob([JSON.stringify({ input: input.name, messages }, null, 2)], {
  type: 'application/json',
})
const link = document.createElement('a')
link.href = URL.createObjectURL(file)
link.download = `stock-v16-bank-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
link.click()
