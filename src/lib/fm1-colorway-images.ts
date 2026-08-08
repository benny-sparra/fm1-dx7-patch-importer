import blackImage from '@/assets/fm1-black.webp'
import blackGreenImage from '@/assets/fm1-black-green.webp'
import coolGrayImage from '@/assets/fm1-cool-gray.webp'
import orangeImage from '@/assets/fm1-orange.webp'
import purpleImage from '@/assets/fm1-purple.webp'
import whiteBlueImage from '@/assets/fm1-white-blue.webp'

import { type Fm1Colorway } from './fm1-colorway'

export const fm1ColorwayImages = {
  black: blackImage,
  purple: purpleImage,
  orange: orangeImage,
  'black-green': blackGreenImage,
  'cool-gray': coolGrayImage,
  'white-blue': whiteBlueImage,
} satisfies Record<Fm1Colorway, string>
