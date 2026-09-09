import synth240 from '@/assets/generated/fm1-synth-240.webp'
import synth360 from '@/assets/generated/fm1-synth-360.webp'
import synth500 from '@/assets/fm1-synth.webp'

import { type ResponsiveImage } from './responsive-image'

export const fm1SynthImage = {
  height: 477,
  src: synth500,
  srcSet: `${synth240} 240w, ${synth360} 360w, ${synth500} 500w`,
  width: 500,
} satisfies ResponsiveImage
