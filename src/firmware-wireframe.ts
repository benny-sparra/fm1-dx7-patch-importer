// The firmware page's showcase: the turning FM1 outline the editor's welcome shows, in the finish
// chosen in the editor (firmware-colourway.js sets it before this runs).
import { runFm1Wireframe } from '@/lib/fm1-wireframe-canvas'

const canvas = document.querySelector<HTMLCanvasElement>('.firmware-showcase-canvas')
if (canvas) runFm1Wireframe(canvas)
