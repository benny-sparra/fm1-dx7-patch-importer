import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

// The installed-app icons are rendered from the same source mark as the favicon so the browser tab,
// the launcher, and the standalone window title bar cannot drift apart.
const sourcePath = path.resolve('public/favicon.svg')
const manifestPath = path.resolve('public/manifest.webmanifest')
const outputDirectory = path.resolve('public')

// A maskable icon may be cropped to a circle whose diameter is 80% of the icon. `favicon.svg` fills
// its own canvas, so it is inset onto an opaque square to keep the mark inside that safe zone.
const maskableInsetSize = 390
const maskableBackground = '#000'

const checkOnly = process.argv.includes('--check')

async function renderIcon(icon, size) {
  if (icon.purpose !== 'maskable') {
    return sharp(sourcePath).resize({ height: size, width: size }).png().toBuffer()
  }

  const padding = (size - maskableInsetSize) / 2
  if (!Number.isInteger(padding) || padding <= 0) {
    throw new Error(
      `${icon.src} is ${size}px; a maskable icon needs room for a ${padding}px inset.`,
    )
  }
  const mark = await sharp(sourcePath)
    .resize({ height: maskableInsetSize, width: maskableInsetSize })
    .png()
    .toBuffer()
  return sharp(mark)
    .extend({
      background: maskableBackground,
      bottom: padding,
      left: padding,
      right: padding,
      top: padding,
    })
    .flatten({ background: maskableBackground })
    .png()
    .toBuffer()
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('The web app manifest declares no icons.')
}
if (!manifest.icons.some((icon) => icon.purpose === 'maskable')) {
  throw new Error('The web app manifest declares no maskable icon.')
}

for (const icon of manifest.icons) {
  const size = Number(/^(\d+)x(\d+)$/.exec(icon.sizes)?.[1])
  if (!size || icon.sizes !== `${size}x${size}`) {
    throw new Error(`${icon.src} declares non-square sizes "${icon.sizes}".`)
  }
  if (icon.type !== 'image/png') throw new Error(`${icon.src} declares type "${icon.type}".`)
  if (!icon.src.startsWith('/')) throw new Error(`${icon.src} is not a root-relative path.`)

  const outputPath = path.join(outputDirectory, icon.src)
  let data
  if (checkOnly) {
    try {
      data = await readFile(outputPath)
    } catch (error) {
      throw new Error(`${icon.src} is missing or unreadable. Run npm run icons:generate.`, {
        cause: error,
      })
    }
  } else {
    data = await renderIcon(icon, size)
    await writeFile(outputPath, data)
  }

  // Encoded PNG bytes can vary by platform, so committed icons are checked by shape rather than by
  // byte comparison against a fresh render.
  const metadata = await sharp(data).metadata()
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(
      `${icon.src} is ${metadata.width}x${metadata.height}; expected ${size}x${size}.`,
    )
  }
  if (metadata.format !== 'png') throw new Error(`${icon.src} is not a PNG image.`)

  // A maskable icon is cropped by the platform, so every pixel it can show must be opaque.
  const { isOpaque } = await sharp(data).stats()
  if (icon.purpose === 'maskable' && !isOpaque) {
    throw new Error(`${icon.src} is maskable but has transparent pixels a crop could expose.`)
  }

  console.log(`${icon.src}: ${size}x${size}, ${data.byteLength.toLocaleString('en')} B`)
}

console.log(
  checkOnly ? 'Manifest icons are present, square, and correctly typed.' : 'App icons generated.',
)
