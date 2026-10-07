export const responsiveImageConfig = [
  { height: 554, source: 'fm1-black.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-black-green.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-cool-gray.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-orange.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-purple.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-white-blue.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-black.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-black-green.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-cool-gray.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-orange.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-purple.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-va-white-blue.webp', width: 923, widths: [460] },
  { height: 485, source: 'firmware-fm1-va.webp', width: 923, widths: [460] },
  { height: 563, source: 'firmware-choralroot.webp', width: 923, widths: [460] },
  { height: 462, source: 'firmware-felucca.webp', width: 923, widths: [460] },
  { height: 720, source: 'firmware-fomni.webp', width: 720, widths: [460] },
  { height: 482, source: 'firmware-ghoulbox.webp', width: 923, widths: [460] },
  { height: 720, source: 'firmware-groove-os.webp', width: 720, widths: [460] },
  { height: 964, source: 'firmware-sloop.webp', width: 972, widths: [460] },
  { height: 485, source: 'firmware-sloopdx.webp', width: 923, widths: [460] },
  { height: 960, source: 'firmware-x0x.webp', width: 960, widths: [460] },
  { height: 720, source: 'firmware-jangada.webp', width: 720, widths: [460] },
  { height: 720, source: 'firmware-lunar-modulator.webp', width: 720, widths: [460] },
  { height: 720, source: 'firmware-fm1-quest.webp', width: 720, widths: [460] },
  { height: 477, source: 'fm1-synth.webp', width: 500, widths: [240, 360] },
  { height: 476, source: 'fm1-va-bank-screen.webp', width: 500, widths: [240, 360] },
]

export const generatedImageDirectory = 'src/assets/generated'
export const sourceImageDirectory = 'src/assets'

export function candidateFilename(source, width) {
  return `${source.replace(/\.webp$/, '')}-${width}.webp`
}
