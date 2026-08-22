import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const initialJavaScriptBudget = 148 * 1024
const outputDirectory = path.resolve('dist')
const manifestPath = path.join(outputDirectory, '.vite', 'manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error(`Bundle manifest not found at ${manifestPath}. Run the production build first.`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry)
if (!entry) {
  console.error('Bundle manifest does not contain an application entry.')
  process.exit(1)
}

const initialKeys = new Set()
const visitStaticImports = (key) => {
  if (initialKeys.has(key)) return
  const chunk = manifest[key]
  if (!chunk) throw new Error(`Manifest import ${key} does not exist.`)
  initialKeys.add(key)
  for (const importedKey of chunk.imports ?? []) visitStaticImports(importedKey)
}

visitStaticImports(entry[0])

const measure = ([key, chunk]) => {
  const assetPath = path.join(outputDirectory, chunk.file)
  const contents = fs.readFileSync(assetPath)
  return {
    file: chunk.file,
    gzip: gzipSync(contents, { level: 9 }).byteLength,
    key,
    raw: contents.byteLength,
  }
}

const formatBytes = (bytes) => `${bytes.toLocaleString('en')} B`
const printBreakdown = (title, assets) => {
  console.log(`\n${title}`)
  for (const asset of assets) {
    console.log(
      `  ${asset.file.padEnd(54)} ${formatBytes(asset.raw).padStart(12)} raw  ${formatBytes(asset.gzip).padStart(11)} gzip`,
    )
  }
}

const javascriptChunks = Object.entries(manifest).filter(([, chunk]) => chunk.file.endsWith('.js'))
const initialAssets = javascriptChunks
  .filter(([key]) => initialKeys.has(key))
  .map(measure)
  .sort((left, right) => right.gzip - left.gzip)
const deferredAssets = javascriptChunks
  .filter(([key]) => !initialKeys.has(key))
  .map(measure)
  .sort((left, right) => right.gzip - left.gzip)
const initialGzip = initialAssets.reduce((total, asset) => total + asset.gzip, 0)
const initialRaw = initialAssets.reduce((total, asset) => total + asset.raw, 0)

printBreakdown('Initial transitive JavaScript', initialAssets)
printBreakdown(`Deferred JavaScript (${deferredAssets.length} chunks)`, deferredAssets)
console.log(
  `\nInitial total: ${formatBytes(initialRaw)} raw / ${formatBytes(initialGzip)} gzip; budget: ${formatBytes(initialJavaScriptBudget)} gzip.`,
)

if (initialGzip > initialJavaScriptBudget) {
  console.error(
    `Initial transitive JavaScript exceeds the budget by ${formatBytes(initialGzip - initialJavaScriptBudget)}.`,
  )
  process.exit(1)
}

console.log(
  `Bundle budget passed with ${formatBytes(initialJavaScriptBudget - initialGzip)} headroom.`,
)
