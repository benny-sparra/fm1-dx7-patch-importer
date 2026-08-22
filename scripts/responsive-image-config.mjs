export const responsiveImageConfig = [
  { height: 595, source: 'fm1-keyboard.webp', width: 800, widths: [320, 400, 600] },
  { height: 554, source: 'fm1-black.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-black-green.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-cool-gray.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-orange.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-purple.webp', width: 923, widths: [460] },
  { height: 554, source: 'fm1-white-blue.webp', width: 923, widths: [460] },
  { height: 477, source: 'fm1-synth.webp', width: 500, widths: [240, 360] },
]

export const generatedImageDirectory = 'src/assets/generated'
export const sourceImageDirectory = 'src/assets'

export function candidateFilename(source, width) {
  return `${source.replace(/\.webp$/, '')}-${width}.webp`
}
