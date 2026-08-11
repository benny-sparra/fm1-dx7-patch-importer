import type { CSSProperties } from 'react'

type RangeStyle = CSSProperties & {
  '--range-color': string
  '--range-progress': string
}

export function rangeStyle(
  value: number,
  min: number,
  max: number,
  color = 'var(--color-primary)',
): RangeStyle {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100

  return {
    '--range-color': color,
    '--range-progress': `${Math.min(100, Math.max(0, progress))}%`,
  }
}
