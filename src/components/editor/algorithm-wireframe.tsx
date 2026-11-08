import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import type { Dx7AlgorithmOperator } from '@/lib/dx7-algorithms'
import { createWireframeView, type WireframeView } from '@/lib/wireframe-view'
import { wireScene } from '@/lib/wireframe-3d'

const arrowTurn = 0.15
const turns: Record<string, readonly [number, number]> = {
  ArrowDown: [0, arrowTurn],
  ArrowLeft: [-arrowTurn, 0],
  ArrowRight: [arrowTurn, 0],
  ArrowUp: [0, -arrowTurn],
}

/**
 * The algorithm as wireframe cubes, drawn on a canvas by `createWireframeView`. The picture is
 * decoration: the operators' roles and frequencies are in the rack and its table, so the canvas
 * is hidden from assistive technology, and its focusable frame (a button, so the keyboard reaches it) only turns it with the arrow keys.
 */
export function AlgorithmWireframe({
  algorithm,
  frequencies,
  operators,
}: {
  algorithm: number
  frequencies: readonly string[]
  operators: readonly Dx7AlgorithmOperator[]
}) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<WireframeView | null>(null)
  const scene = useMemo(() => wireScene(operators), [operators])
  const labelKey = frequencies.join('\u0001')
  const labels = useMemo(() => labelKey.split('\u0001'), [labelKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const view = createWireframeView(canvas)
    viewRef.current = view
    return () => {
      view.dispose()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    viewRef.current?.update(scene, labels)
  }, [labels, scene])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const turn = turns[event.key]
    if (!turn || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    viewRef.current?.turn(turn[0], turn[1])
  }

  return (
    <button
      aria-label={t('ui.algorithmWireframeView', { number: algorithm + 1 })}
      className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
      onKeyDown={onKeyDown}
      type="button"
    >
      <canvas
        aria-hidden="true"
        className="size-full cursor-grab touch-none active:cursor-grabbing"
        ref={canvasRef}
      />
    </button>
  )
}
