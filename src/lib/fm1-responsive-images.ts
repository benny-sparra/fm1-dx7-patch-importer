import keyboard320 from '@/assets/generated/fm1-keyboard-320.webp'
import keyboard400 from '@/assets/generated/fm1-keyboard-400.webp'
import keyboard600 from '@/assets/generated/fm1-keyboard-600.webp'
import synth240 from '@/assets/generated/fm1-synth-240.webp'
import synth360 from '@/assets/generated/fm1-synth-360.webp'
import keyboard800 from '@/assets/fm1-keyboard.webp'
import synth500 from '@/assets/fm1-synth.webp'

import { type ResponsiveImage } from './responsive-image'

export const fm1KeyboardImage = {
  height: 595,
  src: keyboard800,
  srcSet: `${keyboard320} 320w, ${keyboard400} 400w, ${keyboard600} 600w, ${keyboard800} 800w`,
  width: 800,
} satisfies ResponsiveImage

export const fm1SynthImage = {
  height: 477,
  src: synth500,
  srcSet: `${synth240} 240w, ${synth360} 360w, ${synth500} 500w`,
  width: 500,
} satisfies ResponsiveImage
