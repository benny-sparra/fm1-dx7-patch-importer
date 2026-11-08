import { useEffect, useRef, useState, type ReactNode } from 'react'

import { runFm1Wireframe, wireframeHeight, wireframeWidth } from '@/lib/fm1-wireframe-canvas'
import { cn } from '@/lib/utils'

type Fm1WireframeProps = {
  /** The page's finish: the outline is redrawn in its colours when it changes. */
  colorway: string
  /** What shows when the browser cannot draw it, the FM1's photo. */
  fallback: ReactNode
}

/**
 * The FM1 as a slowly turning outline, traced from its photo. Decoration only: it is hidden from
 * assistive technology and takes no focus, so the welcome reads the same without it. It turns when
 * dragged, and from the arrow keys while the welcome's dialog has the keyboard.
 */
export function Fm1Wireframe({ colorway, fallback }: Fm1WireframeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [unavailable, setUnavailable] = useState(false)

  // A new finish is a new palette, so the loop starts over with it.
  useEffect(() => {
    const canvas = canvasRef.current
    const cleanup = canvas ? runFm1Wireframe(canvas) : null
    if (!cleanup) {
      setUnavailable(true)
      return
    }
    return cleanup
  }, [colorway])

  if (unavailable) return <>{fallback}</>
  return (
    <canvas
      aria-hidden="true"
      className={cn(
        'crt-inset block h-auto w-[280px] max-w-full cursor-grab touch-pan-y [image-rendering:pixelated] active:cursor-grabbing',
      )}
      height={wireframeHeight}
      ref={canvasRef}
      width={wireframeWidth}
    />
  )
}
