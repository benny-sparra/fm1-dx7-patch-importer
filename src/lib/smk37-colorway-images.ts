import smk37WhiteImage from '@/assets/smk37-white.webp'
import smk37White460 from '@/assets/generated/smk37-white-460.webp'

import { colorwayImage } from './fm1-colorway-images'
import type { Smk37Colorway } from './fm1-colorway'
import type { ResponsiveImage } from './responsive-image'

export type Smk37ColorwayImages = Record<Smk37Colorway, ResponsiveImage>

// M-VAVE's product shot of the SMK-37, on a transparent background at the header photo's size.
// Only a keyboard identified as an SMK-37 loads it, so it stays out of the initial bundle.
export const smk37ColorwayImages = {
  'smk-white': colorwayImage(smk37WhiteImage, smk37White460),
} satisfies Smk37ColorwayImages
