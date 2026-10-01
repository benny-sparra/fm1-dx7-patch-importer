import synth240 from '@/assets/generated/fm1-synth-240.webp'
import synth360 from '@/assets/generated/fm1-synth-360.webp'
import fm1VaBankScreen240 from '@/assets/generated/fm1-va-bank-screen-240.webp'
import fm1VaBankScreen360 from '@/assets/generated/fm1-va-bank-screen-360.webp'
import synth500 from '@/assets/fm1-synth.webp'
import fm1VaBankScreen500 from '@/assets/fm1-va-bank-screen.webp'

import type { ResponsiveImage } from './responsive-image'

export const fm1SynthImage = {
  height: 477,
  src: synth500,
  srcSet: `${synth240} 240w, ${synth360} 360w, ${synth500} 500w`,
  width: 500,
} satisfies ResponsiveImage

/** FM-1+VA's display asking “Write the bank?” after a 32-voice bank arrives. */
export const fm1VaBankScreenImage = {
  height: 476,
  src: fm1VaBankScreen500,
  srcSet: `${fm1VaBankScreen240} 240w, ${fm1VaBankScreen360} 360w, ${fm1VaBankScreen500} 500w`,
  width: 500,
} satisfies ResponsiveImage
