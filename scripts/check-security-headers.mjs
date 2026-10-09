import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const expectedDirectives = new Map([
  ['default-src', ["'self'"]],
  ['base-uri', ["'none'"]],
  ['object-src', ["'none'"]],
  ['frame-ancestors', ["'none'"]],
  ['frame-src', ["'none'"]],
  ['form-action', ["'self'"]],
  ['script-src', ["'self'", 'https://cloud.umami.is']],
  ['script-src-attr', ["'none'"]],
  [
    'connect-src',
    ["'self'", 'https://gateway.umami.is', 'https://o4511966934859776.ingest.de.sentry.io'],
  ],
  ['style-src', ["'self'"]],
  ['style-src-attr', ["'unsafe-inline'"]],
  ['img-src', ["'self'"]],
  ['font-src', ["'self'"]],
  ['worker-src', ["'none'"]],
  ['upgrade-insecure-requests', []],
])

// Every other header the site sends, with its exact value. The Permissions-Policy allows only Web
// MIDI, which the editor needs, and denies the device and payment features it never uses. HSTS
// starts at one day, without includeSubDomains or preload, while plain HTTP is still served: see
// docs/maintaining.md before raising it.
const expectedHeaders = new Map([
  ['X-Content-Type-Options', 'nosniff'],
  ['Strict-Transport-Security', 'max-age=86400'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  [
    'Permissions-Policy',
    'midi=(self), camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), bluetooth=(), payment=()',
  ],
])

function parseHeaders(headers) {
  const values = new Map()
  for (const line of headers.split('\n')) {
    const match = /^\s+([A-Za-z-]+):\s*(.*)$/.exec(line)
    if (!match) continue
    const [, name, value] = match
    if (name === 'Content-Security-Policy') continue
    if (values.has(name)) throw new Error(`${name} is set more than once.`)
    values.set(name, value)
  }
  return values
}

function parsePolicy(headers) {
  const headerLines = headers
    .split('\n')
    .filter((line) => /^\s+Content-Security-Policy:/i.test(line))
  if (headerLines.length !== 1) {
    throw new Error(`Found ${headerLines.length} Content-Security-Policy headers; expected one.`)
  }

  const policy = headerLines[0].replace(/^\s+Content-Security-Policy:\s*/i, '')
  const directives = new Map()
  for (const declaration of policy.split(';')) {
    const [name, ...sources] = declaration.trim().split(/\s+/)
    if (!name) continue
    if (directives.has(name)) throw new Error(`Content-Security-Policy repeats ${name}.`)
    directives.set(name, sources)
  }
  return directives
}

const sourcePath = path.resolve('public/_headers')
const outputPath = path.resolve('dist/_headers')
let sourceHeaders
let outputHeaders
try {
  ;[sourceHeaders, outputHeaders] = await Promise.all([
    readFile(sourcePath, 'utf8'),
    readFile(outputPath, 'utf8'),
  ])
} catch (error) {
  throw new Error('Security headers are missing. Run npm run build first.', { cause: error })
}

if (sourceHeaders !== outputHeaders) {
  throw new Error('The production security headers differ from public/_headers.')
}
if (!sourceHeaders.startsWith('/*\n')) {
  throw new Error('Security headers must apply to every Cloudflare Pages route.')
}

const directives = parsePolicy(outputHeaders)
if (directives.size !== expectedDirectives.size) {
  throw new Error(
    `Content-Security-Policy has ${directives.size} directives; expected ${expectedDirectives.size}.`,
  )
}
for (const [name, expectedSources] of expectedDirectives) {
  const sources = directives.get(name)
  if (!sources || sources.join(' ') !== expectedSources.join(' ')) {
    throw new Error(
      `${name} is ${sources?.join(' ') || 'missing'}; expected ${expectedSources.join(' ') || 'no sources'}.`,
    )
  }
}

const headers = parseHeaders(outputHeaders)
for (const name of headers.keys()) {
  if (!expectedHeaders.has(name)) {
    throw new Error(`${name} is not a header the security check knows; add it to expectedHeaders.`)
  }
}
for (const [name, expectedValue] of expectedHeaders) {
  const value = headers.get(name)
  if (value !== expectedValue) {
    throw new Error(`${name} is ${value ?? 'missing'}; expected ${expectedValue}.`)
  }
}

const outputDirectory = path.resolve('dist')
const assetDirectory = path.join(outputDirectory, 'assets')
const browserTextFiles = [
  path.join(outputDirectory, 'index.html'),
  path.join(outputDirectory, 'firmware', 'index.html'),
  ...(await readdir(assetDirectory))
    .filter((filename) => /\.(?:css|js)$/.test(filename))
    .map((filename) => path.join(assetDirectory, filename)),
]
for (const filename of browserTextFiles) {
  const contents = await readFile(filename, 'utf8')
  if (contents.includes('data:image/')) {
    throw new Error(
      `${path.relative(outputDirectory, filename)} contains an image blocked by img-src 'self'.`,
    )
  }
}

console.log(
  `Verified ${directives.size} production Content-Security-Policy directives and ${headers.size} other security headers.`,
)
