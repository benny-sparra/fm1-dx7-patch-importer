import { readdir, readFile } from 'node:fs/promises'
import { SourceMap } from 'node:module'
import path from 'node:path'

const outputDirectory = path.resolve('dist')
const sourceMapMode = process.env.SOURCE_MAPS || 'public'
const supportedModes = new Set(['hidden', 'none', 'public'])
if (!supportedModes.has(sourceMapMode)) {
  throw new Error(`Invalid SOURCE_MAPS value "${sourceMapMode}". Use public, hidden, or none.`)
}

async function findFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory() ? findFiles(entryPath) : [entryPath]
    }),
  )
  return nested.flat()
}

let files
try {
  files = await findFiles(outputDirectory)
} catch (error) {
  throw new Error('Production output is missing. Run npm run build first.', { cause: error })
}

const javascriptFiles = files.filter((file) => file.endsWith('.js'))
const mapFiles = files.filter((file) => file.endsWith('.js.map'))
if (javascriptFiles.length === 0)
  throw new Error('Production output contains no JavaScript chunks.')

const referencedMaps = new Set()
for (const javascriptFile of javascriptFiles) {
  const javascript = await readFile(javascriptFile, 'utf8')
  const comments = [...javascript.matchAll(/\/\/# sourceMappingURL=(\S+)/g)].map(
    (match) => match[1],
  )
  if (comments.some((comment) => comment.startsWith('data:'))) {
    throw new Error(
      `${path.relative(outputDirectory, javascriptFile)} contains an inline source map.`,
    )
  }

  if (sourceMapMode === 'public') {
    if (comments.length !== 1) {
      throw new Error(
        `${path.relative(outputDirectory, javascriptFile)} has ${comments.length} source-map comments; expected one.`,
      )
    }
    const mapPath = path.resolve(path.dirname(javascriptFile), comments[0])
    if (!mapPath.startsWith(`${outputDirectory}${path.sep}`)) {
      throw new Error(
        `${path.relative(outputDirectory, javascriptFile)} references a map outside dist/.`,
      )
    }
    referencedMaps.add(mapPath)
  } else if (comments.length !== 0) {
    throw new Error(
      `${path.relative(outputDirectory, javascriptFile)} advertises a source map in ${sourceMapMode} mode.`,
    )
  }
}

if (sourceMapMode === 'none' && mapFiles.length !== 0) {
  throw new Error(`Found ${mapFiles.length} source maps in none mode.`)
}
if (sourceMapMode !== 'none' && mapFiles.length !== javascriptFiles.length) {
  throw new Error(
    `Found ${mapFiles.length} source maps for ${javascriptFiles.length} JavaScript chunks.`,
  )
}

const privateReference =
  /(?:^|[\\/])(?:\.cert|\.env(?:\.|$))|\/Users\/|(?:^|[\s"'(=])[A-Za-z]:\\|localhost-key|-----BEGIN [A-Z ]*PRIVATE KEY-----/
for (const mapFile of mapFiles) {
  if (sourceMapMode === 'public' && !referencedMaps.has(mapFile)) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} is an orphaned source map.`)
  }

  let sourceMap
  try {
    sourceMap = JSON.parse(await readFile(mapFile, 'utf8'))
  } catch (error) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} is not valid JSON.`, {
      cause: error,
    })
  }

  const javascriptFilename = path.basename(mapFile, '.map')
  if (sourceMap.file !== javascriptFilename) {
    throw new Error(
      `${path.relative(outputDirectory, mapFile)} identifies ${String(sourceMap.file)} instead of ${javascriptFilename}.`,
    )
  }
  if (!Array.isArray(sourceMap.sources) || !Array.isArray(sourceMap.sourcesContent)) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} does not retain source contents.`)
  }
  if (sourceMap.sources.length !== sourceMap.sourcesContent.length) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} has incomplete source contents.`)
  }
  if (
    sourceMap.sourceRoot &&
    (typeof sourceMap.sourceRoot !== 'string' ||
      path.isAbsolute(sourceMap.sourceRoot) ||
      privateReference.test(sourceMap.sourceRoot))
  ) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} has an unsafe source root.`)
  }

  for (const source of sourceMap.sources) {
    if (typeof source !== 'string' || path.isAbsolute(source) || privateReference.test(source)) {
      throw new Error(
        `${path.relative(outputDirectory, mapFile)} has unsafe source path ${source}.`,
      )
    }
  }
  for (const contents of sourceMap.sourcesContent) {
    if (typeof contents !== 'string' || privateReference.test(contents)) {
      throw new Error(
        `${path.relative(outputDirectory, mapFile)} contains a private local reference.`,
      )
    }
  }

  const resolvedMapping = new SourceMap(sourceMap).findEntry(0, Number.MAX_SAFE_INTEGER)
  if (
    !resolvedMapping.originalSource ||
    !sourceMap.sources.includes(resolvedMapping.originalSource)
  ) {
    throw new Error(`${path.relative(outputDirectory, mapFile)} does not resolve generated code.`)
  }
}

console.log(
  `Verified ${javascriptFiles.length} JavaScript chunks with ${sourceMapMode} source-map policy (${mapFiles.length} maps).`,
)
