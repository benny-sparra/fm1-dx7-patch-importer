import blackImage from '@/assets/fm1-black.webp'
import black460 from '@/assets/generated/fm1-black-460.webp'
import blackGreenImage from '@/assets/fm1-black-green.webp'
import blackGreen460 from '@/assets/generated/fm1-black-green-460.webp'
import coolGrayImage from '@/assets/fm1-cool-gray.webp'
import coolGray460 from '@/assets/generated/fm1-cool-gray-460.webp'
import orangeImage from '@/assets/fm1-orange.webp'
import orange460 from '@/assets/generated/fm1-orange-460.webp'
import purpleImage from '@/assets/fm1-purple.webp'
import purple460 from '@/assets/generated/fm1-purple-460.webp'
import whiteBlueImage from '@/assets/fm1-white-blue.webp'
import whiteBlue460 from '@/assets/generated/fm1-white-blue-460.webp'

import { type Fm1Colorway } from './fm1-colorway'
import { type ResponsiveImage } from './responsive-image'

function colorwayImage(src: string, candidate460: string): ResponsiveImage {
  return {
    height: 554,
    src,
    srcSet: `${candidate460} 460w, ${src} 923w`,
    width: 923,
  }
}

export const fm1ColorwayImages = {
  black: colorwayImage(blackImage, black460),
  purple: colorwayImage(purpleImage, purple460),
  orange: colorwayImage(orangeImage, orange460),
  'black-green': colorwayImage(blackGreenImage, blackGreen460),
  'cool-gray': colorwayImage(coolGrayImage, coolGray460),
  'white-blue': colorwayImage(whiteBlueImage, whiteBlue460),
} satisfies Record<Fm1Colorway, ResponsiveImage>
