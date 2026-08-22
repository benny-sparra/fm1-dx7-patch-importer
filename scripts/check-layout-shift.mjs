import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const maximumCls = 0.1
const startupTimeoutMs = 20_000

function findChrome() {
  const candidates = [
    process.env.CLS_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')
      : undefined,
  ].filter(Boolean)
  const executable = candidates.find((candidate) => existsSync(candidate))
  if (!executable) {
    throw new Error('Chrome or Chromium was not found. Set CLS_CHROME_PATH to its executable.')
  }
  return executable
}

async function availablePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise((resolve) => server.close(resolve))
  if (!port) throw new Error('Could not allocate a local preview port.')
  return port
}

async function waitFor(check, description) {
  const deadline = Date.now() + startupTimeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const result = await check()
      if (result) return result
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for ${description}.`, { cause: lastError })
}

class CdpConnection {
  constructor(url) {
    this.nextId = 1
    this.pending = new Map()
    this.socket = new WebSocket(url)
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.socket.close()
  }
}

async function main() {
  const chromePath = findChrome()
  const profileDirectory = await mkdtemp(path.join(tmpdir(), 'fm1-cls-'))
  const port = await availablePort()
  const url = `http://127.0.0.1:${port}/`
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  let chrome
  let connection
  const preview = spawn(
    npmCommand,
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  try {
    await waitFor(async () => (await fetch(url)).ok, 'the production preview')
    chrome = spawn(
      chromePath,
      [
        '--headless=new',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-component-update',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=0',
        `--user-data-dir=${profileDirectory}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    const devtoolsPort = await waitFor(async () => {
      const contents = await readFile(path.join(profileDirectory, 'DevToolsActivePort'), 'utf8')
      return Number(contents.split('\n')[0]) || null
    }, 'Chrome DevTools')
    const target = await waitFor(async () => {
      const targets = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)).json()
      return targets.find((candidate) => candidate.type === 'page')
    }, 'a Chrome page target')

    connection = new CdpConnection(target.webSocketDebuggerUrl)
    await connection.connect()
    await Promise.all([
      connection.send('Page.enable'),
      connection.send('Runtime.enable'),
      connection.send('Network.enable'),
    ])
    await connection.send('Network.setCacheDisabled', { cacheDisabled: true })
    await connection.send('Network.emulateNetworkConditions', {
      connectionType: 'cellular3g',
      downloadThroughput: 1_638_400 / 8,
      latency: 150,
      offline: false,
      uploadThroughput: 768_000 / 8,
    })
    await connection.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await connection.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 823,
      mobile: true,
      width: 412,
    })
    await connection.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__initialPageCls = { entries: [], value: 0 };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__initialPageCls.value += entry.value;
            window.__initialPageCls.entries.push({ value: entry.value, time: entry.startTime });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      `,
    })

    await connection.send('Page.navigate', { url })
    await waitFor(async () => {
      const state = await connection.send('Runtime.evaluate', {
        expression: 'document.readyState',
        returnByValue: true,
      })
      return state.result.value === 'complete'
    }, 'the page load')
    const result = await connection.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          const deadline = performance.now() + 10000;
          while (document.querySelector('[role="status"]') && performance.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await new Promise((resolve) => setTimeout(resolve, 500));
          return window.__initialPageCls;
        })()
      `,
      returnByValue: true,
    })
    const measurement = result.result.value
    console.log(JSON.stringify({ maximumCls, ...measurement }, null, 2))
    if (measurement.value > maximumCls) {
      throw new Error(`Initial-page CLS ${measurement.value.toFixed(4)} exceeded ${maximumCls}.`)
    }
  } finally {
    connection?.close()
    chrome?.kill('SIGTERM')
    preview.kill('SIGTERM')
    await rm(profileDirectory, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
