import type { CSSProperties } from 'react'

type RangeStyle = CSSProperties & {
  '--range-color': string
  '--range-end': string
  '--range-start': string
}

export function rangeStyle(
  value: number,
  min: number,
  max: number,
  color = 'var(--color-primary)',
  origin = min,
): RangeStyle {
  const toPercentage = (point: number) => {
    const progress = max === min ? 0 : ((point - min) / (max - min)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  const valuePercentage = toPercentage(value)
  const originPercentage = toPercentage(origin)

  return {
    '--range-color': color,
    '--range-end': `${Math.max(valuePercentage, originPercentage)}%`,
    '--range-start': `${Math.min(valuePercentage, originPercentage)}%`,
  }
}
