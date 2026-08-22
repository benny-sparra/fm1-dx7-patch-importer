import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  candidateFilename,
  generatedImageDirectory,
  responsiveImageConfig,
} from './responsive-image-config.mjs'

const outputDirectory = path.resolve('dist/assets')
let outputFiles
try {
  outputFiles = await readdir(outputDirectory)
} catch (error) {
  throw new Error('Production assets are missing. Run npm run build first.', { cause: error })
}

let checked = 0
for (const image of responsiveImageConfig) {
  for (const width of image.widths) {
    const sourceFilename = candidateFilename(image.source, width)
    const stem = sourceFilename.replace(/\.webp$/, '')
    const matches = outputFiles.filter(
      (filename) => filename.startsWith(`${stem}-`) && filename.endsWith('.webp'),
    )
    if (matches.length !== 1) {
      throw new Error(
        `${sourceFilename} has ${matches.length} hashed production assets; expected one.`,
      )
    }

    const source = await readFile(path.resolve(generatedImageDirectory, sourceFilename))
    const outputPath = path.join(outputDirectory, matches[0])
    const output = await readFile(outputPath)
    if (!source.equals(output)) throw new Error(`${matches[0]} differs from ${sourceFilename}.`)

    const metadata = await sharp(output).metadata()
    const expectedHeight = Math.round((image.height * width) / image.width)
    if (metadata.width !== width || metadata.height !== expectedHeight) {
      throw new Error(
        `${matches[0]} is ${metadata.width}x${metadata.height}; expected ${width}x${expectedHeight}.`,
      )
    }
    checked += 1
  }
}

console.log(`Verified ${checked} hashed responsive image assets in the production build.`)
