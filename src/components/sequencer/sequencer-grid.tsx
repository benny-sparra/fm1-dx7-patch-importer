import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { sequencerNamespace } from '@/i18n/sequencer'
import {
  fm1SequenceMaxPitch,
  fm1SequenceMaxVelocity,
  fm1SequenceMinPitch,
  fm1SequenceMinVelocity,
  type Fm1Pattern,
  type Fm1SequenceStep,
} from '@/lib/fm1-sequence'
import { isBlackKey } from '@/lib/piano-keyboard'
import { midiNoteName } from '@/lib/midi'
import { cn } from '@/lib/utils'

/** Two octaves at a time, the same window the on-screen keyboard shows. */
const visibleSemitones = 24
const defaultBaseNote = 60
const defaultVelocity = 90

type SequencerGridProps = {
  onChangeStep: (index: number, step: Fm1SequenceStep) => void
  pattern: Fm1Pattern
}

/**
 * The pattern as a grid: one column per step, one row per pitch.
 *
 * Every step is one step long and the FM1's global Gate decides how long it sounds, so there is
 * nothing to drag out: a step is a single cell, and a column holds at most one, because a recorded
 * step holds one note. A column with no cell is a rest.
 *
 * Only two octaves are shown at a time. A note outside them would leave its column looking empty,
 * which reads as a rest, so the column header always names the note the step plays and the view
 * follows a pattern that arrives from elsewhere.
 */
export function SequencerGrid({ onChangeStep, pattern }: SequencerGridProps) {
  const { t } = useTranslation(sequencerNamespace)
  const gridId = useId()
  const gridRef = useRef<HTMLDivElement>(null)
  const [baseNote, setBaseNote] = useState(defaultBaseNote)
  const [focusedCell, setFocusedCell] = useState({ column: 0, row: 0 })

  const notes = Array.from(
    { length: visibleSemitones },
    (_unused, offset) => baseNote + visibleSemitones - 1 - offset,
  )
  const pitchOf = (step: Fm1SequenceStep) => (step.kind === 'note' ? step.pitch : null)

  // A pattern that arrives from a hardware reading, or from clearing, may sit outside the window.
  const sounded = pattern.steps.map(pitchOf).filter((pitch): pitch is number => pitch !== null)
  const lowest = sounded.length > 0 ? Math.min(...sounded) : null
  useEffect(() => {
    if (lowest === null) return
    setBaseNote((current) =>
      lowest < current || lowest > current + visibleSemitones - 1
        ? Math.max(
            fm1SequenceMinPitch,
            Math.min(lowest, fm1SequenceMaxPitch - visibleSemitones + 1),
          )
        : current,
    )
  }, [lowest])

  const shiftOctave = (semitones: number) =>
    setBaseNote((current) =>
      Math.max(
        fm1SequenceMinPitch,
        Math.min(current + semitones, fm1SequenceMaxPitch - visibleSemitones + 1),
      ),
    )

  const toggleCell = (column: number, pitch: number) => {
    const step = pattern.steps[column]
    if (step.kind === 'note' && step.pitch === pitch) {
      onChangeStep(column, { kind: 'rest' })
      return
    }
    onChangeStep(column, {
      kind: 'note',
      pitch,
      velocity: step.kind === 'note' ? step.velocity : defaultVelocity,
    })
  }

  const moveFocus = (column: number, row: number) => {
    const nextColumn = Math.max(0, Math.min(column, pattern.steps.length - 1))
    const nextRow = Math.max(0, Math.min(row, notes.length - 1))
    setFocusedCell({ column: nextColumn, row: nextRow })
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${nextColumn}-${nextRow}"]`)
      ?.focus()
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tracking-[0.08em]" id={`${gridId}-label`}>
          {t('grid.heading')}
        </span>
        <Button
          aria-label={t('grid.octaveDown')}
          onClick={() => shiftOctave(-12)}
          type="button"
          variant="outline"
        >
          <ChevronDown aria-hidden="true" />
        </Button>
        <Button
          aria-label={t('grid.octaveUp')}
          onClick={() => shiftOctave(12)}
          type="button"
          variant="outline"
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <span className="font-vt323 text-sm">
          {midiNoteName(baseNote)}–{midiNoteName(baseNote + visibleSemitones - 1)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div
          aria-labelledby={`${gridId}-label`}
          className="grid w-max gap-px"
          onKeyDown={(event) => {
            const { column, row } = focusedCell
            if (event.key === 'ArrowLeft') moveFocus(column - 1, row)
            else if (event.key === 'ArrowRight') moveFocus(column + 1, row)
            else if (event.key === 'ArrowUp') moveFocus(column, row - 1)
            else if (event.key === 'ArrowDown') moveFocus(column, row + 1)
            else return
            // The grid owns the arrow keys while focus is inside it, so the page does not scroll.
            event.preventDefault()
          }}
          ref={gridRef}
          role="grid"
          style={{ gridTemplateColumns: `3rem repeat(${pattern.steps.length}, 2rem)` }}
          // Focus lives on the cells, which carry the roving tab stop; the grid itself is only a
          // programmatic target.
          tabIndex={-1}
        >
          <div className="contents" role="row">
            <span className="text-[0.625rem] text-[var(--crt-ink-3)]" role="columnheader">
              <span className="sr-only">{t('grid.pitchColumn')}</span>
            </span>
            {pattern.steps.map((step, column) => (
              <span
                className="font-vt323 text-center text-[0.625rem] text-[var(--crt-ink-3)]"
                key={column}
                role="columnheader"
                title={
                  step.kind === 'note'
                    ? t('grid.stepPlays', { note: midiNoteName(step.pitch), step: column + 1 })
                    : t('grid.stepRests', { step: column + 1 })
                }
              >
                {step.kind === 'note' ? midiNoteName(step.pitch) : column + 1}
              </span>
            ))}
          </div>

          {notes.map((pitch, row) => (
            <div className="contents" key={pitch} role="row">
              {/*
               * The rail is a keyboard seen from the side: every row is a white key, and a black
               * key sits over the outer part of the rows that have one. It names the octave only,
               * as a keyboard does, so each row still carries its note name for a screen reader.
               */}
              <div
                className="synthwave-piano-rail-white relative flex h-6 items-center justify-end border-y pr-1"
                role="rowheader"
              >
                <span className="sr-only">{midiNoteName(pitch)}</span>
                {isBlackKey(pitch) ? (
                  <span
                    aria-hidden="true"
                    className="synthwave-piano-rail-black absolute inset-y-0 left-0 w-[62%] rounded-r-[0.2rem] border-y"
                  />
                ) : null}
                {pitch % 12 === 0 ? (
                  <span
                    aria-hidden="true"
                    className="font-vt323 text-[0.625rem] text-[var(--crt-bg-0)]"
                  >
                    {midiNoteName(pitch)}
                  </span>
                ) : null}
              </div>
              {pattern.steps.map((step, column) => {
                const lit = step.kind === 'note' && step.pitch === pitch
                return (
                  <div key={column} role="gridcell">
                    <button
                      aria-label={t('grid.cell', {
                        note: midiNoteName(pitch),
                        step: column + 1,
                      })}
                      aria-pressed={lit}
                      className={cn(
                        'h-6 w-full cursor-pointer border border-[var(--crt-line-lt)] transition-colors motion-reduce:transition-none',
                        lit
                          ? 'bg-[var(--crt-acc-lt)]'
                          : isBlackKey(pitch)
                            ? 'bg-[var(--crt-shadow)] hover:bg-[var(--crt-sel-bg)]'
                            : 'bg-[var(--crt-bg-1)] hover:bg-[var(--crt-sel-bg)]',
                        // Each C carries the octave line, so a row can be placed at a glance.
                        pitch % 12 === 0 && 'border-t-[var(--crt-acc)]',
                      )}
                      data-cell={`${column}-${row}`}
                      onClick={() => {
                        setFocusedCell({ column, row })
                        toggleCell(column, pitch)
                      }}
                      tabIndex={focusedCell.column === column && focusedCell.row === row ? 0 : -1}
                      type="button"
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid w-max items-center gap-px"
          style={{ gridTemplateColumns: `3rem repeat(${pattern.steps.length}, 2rem)` }}
        >
          <span className="text-[0.625rem] tracking-[0.08em] text-[var(--crt-ink-3)]">
            {t('grid.velocityLane')}
          </span>
          {pattern.steps.map((step, column) => (
            <input
              aria-label={t('grid.velocityFor', { step: column + 1 })}
              // Upright, like a mixer's fader: a horizontal slider in a two-rem column is
              // impossible to aim at. Browsers without vertical range support lay it out
              // horizontally, which still works.
              className="h-16 w-full justify-self-center [direction:rtl] [writing-mode:vertical-lr]"
              disabled={step.kind !== 'note'}
              key={column}
              max={fm1SequenceMaxVelocity}
              min={fm1SequenceMinVelocity}
              onChange={(event) => {
                if (step.kind !== 'note') return
                onChangeStep(column, {
                  kind: 'note',
                  pitch: step.pitch,
                  velocity: Number.parseInt(event.target.value, 10),
                })
              }}
              title={
                step.kind === 'note'
                  ? t('grid.velocityValue', { step: column + 1, velocity: step.velocity })
                  : undefined
              }
              type="range"
              value={step.kind === 'note' ? step.velocity : defaultVelocity}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
