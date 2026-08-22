import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  candidateFilename,
  generatedImageDirectory,
  responsiveImageConfig,
  sourceImageDirectory,
} from './responsive-image-config.mjs'

const checkOnly = process.argv.includes('--check')
const webpOptions = {
  alphaQuality: 100,
  effort: 6,
  quality: 84,
  smartSubsample: true,
}

async function renderCandidate(sourcePath, width) {
  return sharp(sourcePath)
    .resize({ fit: 'inside', kernel: sharp.kernel.lanczos3, width, withoutEnlargement: true })
    .webp(webpOptions)
    .toBuffer({ resolveWithObject: true })
}

async function processImage(image) {
  const sourcePath = path.resolve(sourceImageDirectory, image.source)
  const sourceMetadata = await sharp(sourcePath).metadata()
  if (sourceMetadata.width !== image.width || sourceMetadata.height !== image.height) {
    throw new Error(
      `${image.source} is ${sourceMetadata.width}x${sourceMetadata.height}; expected ${image.width}x${image.height}.`,
    )
  }

  const sourceSize = (await stat(sourcePath)).size
  for (const width of image.widths) {
    const filename = candidateFilename(image.source, width)
    const outputPath = path.resolve(generatedImageDirectory, filename)
    const expectedHeight = Math.round((image.height * width) / image.width)
    let candidate

    if (checkOnly) {
      try {
        const data = await readFile(outputPath)
        candidate = { data, info: await sharp(data).metadata() }
      } catch (error) {
        throw new Error(`${filename} is missing or unreadable. Run npm run images:generate.`, {
          cause: error,
        })
      }
    } else {
      candidate = await renderCandidate(sourcePath, width)
    }
    const { data, info } = candidate

    if (info.width !== width || info.height !== expectedHeight) {
      throw new Error(
        `${filename} is ${info.width}x${info.height}; expected ${width}x${expectedHeight}.`,
      )
    }
    if (data.byteLength >= sourceSize) {
      throw new Error(`${filename} is not smaller than its ${sourceSize}-byte source.`)
    }
    if (info.format !== 'webp') throw new Error(`${filename} is not a WebP image.`)
    if (!checkOnly) await writeFile(outputPath, data)

    console.log(
      `${filename}: ${info.width}x${info.height}, ${data.byteLength.toLocaleString('en')} B`,
    )
  }
}

if (!checkOnly) await mkdir(path.resolve(generatedImageDirectory), { recursive: true })
for (const image of responsiveImageConfig) await processImage(image)

console.log(
  checkOnly ? 'Responsive image sources and candidates are valid.' : 'Responsive images generated.',
)
