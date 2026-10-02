import fm1VaBlackImage from '@/assets/fm1-va-black.webp'
import fm1VaBlack460 from '@/assets/generated/fm1-va-black-460.webp'
import fm1VaBlackGreenImage from '@/assets/fm1-va-black-green.webp'
import fm1VaBlackGreen460 from '@/assets/generated/fm1-va-black-green-460.webp'
import fm1VaCoolGrayImage from '@/assets/fm1-va-cool-gray.webp'
import fm1VaCoolGray460 from '@/assets/generated/fm1-va-cool-gray-460.webp'
import fm1VaOrangeImage from '@/assets/fm1-va-orange.webp'
import fm1VaOrange460 from '@/assets/generated/fm1-va-orange-460.webp'
import fm1VaPurpleImage from '@/assets/fm1-va-purple.webp'
import fm1VaPurple460 from '@/assets/generated/fm1-va-purple-460.webp'
import fm1VaWhiteBlueImage from '@/assets/fm1-va-white-blue.webp'
import fm1VaWhiteBlue460 from '@/assets/generated/fm1-va-white-blue-460.webp'

import { colorwayImage, type Fm1ColorwayImages } from './fm1-colorway-images'

// The same finishes showing FM-1+VA, Baud Girl's firmware, on the screen. Only an FM1 identified as
// running it loads them, so they stay out of the initial bundle.
export const fm1VaColorwayImages = {
  black: colorwayImage(fm1VaBlackImage, fm1VaBlack460),
  purple: colorwayImage(fm1VaPurpleImage, fm1VaPurple460),
  orange: colorwayImage(fm1VaOrangeImage, fm1VaOrange460),
  'black-green': colorwayImage(fm1VaBlackGreenImage, fm1VaBlackGreen460),
  'cool-gray': colorwayImage(fm1VaCoolGrayImage, fm1VaCoolGray460),
  'white-blue': colorwayImage(fm1VaWhiteBlueImage, fm1VaWhiteBlue460),
} satisfies Fm1ColorwayImages
