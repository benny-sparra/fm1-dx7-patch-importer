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

const outputDirectory = path.resolve('dist')
const assetDirectory = path.join(outputDirectory, 'assets')
const browserTextFiles = [
  path.join(outputDirectory, 'index.html'),
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

console.log(`Verified ${directives.size} production Content-Security-Policy directives.`)
