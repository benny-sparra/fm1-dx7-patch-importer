import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * The value a readout showed last, fading out behind the new one like slow phosphor on a CRT. It
 * draws nothing until the value first changes, and each change starts the fade again. The figures
 * come from `data-afterglow` through CSS rather than text, so the page never holds the old value as
 * text, and reduced motion leaves it out (`src/index.css`).
 */
export function PhosphorAfterglow({ className, text }: { className?: string; text: string }) {
  const [glow, setGlow] = useState({ count: 0, previous: '', text })
  if (glow.text !== text) setGlow({ count: glow.count + 1, previous: glow.text, text })
  if (glow.count === 0) return null
  return (
    <span
      aria-hidden="true"
      className={cn('phosphor-afterglow pointer-events-none', className)}
      data-afterglow={glow.previous}
      key={glow.count}
    />
  )
}
