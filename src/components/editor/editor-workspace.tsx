import { ChevronDown, RadioTower, Route } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpPopover } from '@/components/ui/help-popover'
import {
  dx7Algorithms,
  getDx7OperatorRole,
  type Dx7AlgorithmOperator,
} from '@/lib/dx7-algorithms'
import {
  envelopePath,
  formatOperatorFixedFrequency,
  formatOperatorRatio,
  operatorColors,
} from '@/lib/editor-visuals'
import { getOperatorAuditionStatus } from '@/lib/operator-audition'
import { cn } from '@/lib/utils'

function AlgorithmDiagram({
  className,
  featured = false,
  operators,
}: {
  className?: string
  featured?: boolean
  operators: readonly Dx7AlgorithmOperator[]
}) {
  const nodeX = (operator: Dx7AlgorithmOperator) => operator.x * 18 + 9
  const nodeY = (operator: Dx7AlgorithmOperator) => operator.y * 15 + 8

  const linkPath = (operator: Dx7AlgorithmOperator) => {
    const x = nodeX(operator)
    const y = nodeY(operator) + 5

    switch (operator.link) {
      case 0: return `M ${x} ${y} V ${y + 10}`
      case 1: return `M ${x} ${y} V ${y + 7} H ${x + 18}`
      case 2: return `M ${x} ${y} V ${y + 8}`
      case 3: return `M ${x} ${y} V ${y + 10} M ${x} ${y + 7} H ${x + 18} V ${y + 10}`
      case 4: return `M ${x} ${y} V ${y + 10} M ${x - 18} ${y + 7} V ${y + 10} H ${x + 18} V ${y + 10}`
      case 6: return `M ${x} ${y} V ${y + 7} H ${x + 36}`
      case 7: return `M ${x} ${y} V ${y + 7} H ${x - 18}`
    }
  }

  const feedbackPath = (operator: Dx7AlgorithmOperator) => {
    if (operator.feedback === 0) return undefined
    const x = nodeX(operator)
    const y = nodeY(operator)
    if (operator.feedback === 2) return `M ${x} ${y - 5} V ${y - 9} H ${x + 10} V ${y + 38} H ${x}`
    if (operator.feedback === 3) return `M ${x} ${y - 5} V ${y - 9} H ${x + 10} V ${y + 23} H ${x}`
    const direction = operator.feedback === 4 ? -1 : 1
    return `M ${x} ${y - 5} V ${y - 9} H ${x + 10 * direction} V ${y + 7} H ${x}`
  }

  return (
    <svg
      aria-hidden="true"
      className={cn('h-16 w-full overflow-visible', className)}
      viewBox={featured ? '11 4 88 54' : '0 -3 110 68'}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {operators.map((operator) => <path d={linkPath(operator)} key={`link-${operator.id}`} />)}
        {operators.map((operator) => {
          const path = feedbackPath(operator)
          return path ? <path className="opacity-65" d={path} key={`feedback-${operator.id}`} /> : null
        })}
      </g>
      {operators.map((operator) => (
        <g key={operator.id}>
          <circle
            cx={nodeX(operator)}
            cy={nodeY(operator)}
            fill={getDx7OperatorRole(operator) === 'carrier' ? 'currentColor' : 'var(--algorithm-background, #020617)'}
            r="6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <text
            className={cn(
              'font-mono text-[7px] font-black',
              getDx7OperatorRole(operator) === 'carrier' ? 'fill-slate-950' : 'fill-current',
            )}
            dominantBaseline="central"
            textAnchor="middle"
            x={nodeX(operator)}
            y={nodeY(operator) + 0.5}
          >
            {operator.id}
          </text>
        </g>
      ))}
    </svg>
  )
}

type AlgorithmPanelProps = {
  algorithm: number
  feedback: number
  onAlgorithmChange: (algorithm: number) => void
  onFeedbackChange: (feedback: number) => void
  onFeedbackGestureEnd: () => void
  onFeedbackGestureStart: () => void
}

export function AlgorithmPanel({
  algorithm,
  feedback,
  onAlgorithmChange,
  onFeedbackChange,
  onFeedbackGestureEnd,
  onFeedbackGestureStart,
}: AlgorithmPanelProps) {
  const { t } = useTranslation()
  const dropdownRef = useRef<HTMLDetailsElement>(null)

  const selectAlgorithm = (index: number) => {
    onAlgorithmChange(index)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <section className="editor-console relative z-10 flex w-full min-w-0 flex-col rounded-xl border border-primary/35 text-white shadow-sm">
      <details className="group flex-1" ref={dropdownRef}>
        <summary
          aria-label={`Algorithm ${algorithm + 1}. Choose algorithm`}
          className="flex h-[8rem] cursor-pointer list-none flex-col rounded-t-xl px-3 pb-1.5 pt-2 text-cyan-100 transition hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden"
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
              <Route className="size-3.5" />
              Algorithm
              <HelpPopover
                className="text-cyan-100/70 hover:bg-white/10 hover:text-white"
                label={t('editor.algorithm')}
                text={t('controlHelp.algorithm')}
              />
            </span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </span>
          <span className="mt-1 flex min-h-0 w-full flex-1 -translate-y-2 items-center gap-1">
            <span className="font-mono text-xl font-black leading-none text-white">
              {String(algorithm + 1).padStart(2, '0')}
            </span>
            <AlgorithmDiagram
              className="h-[4.75rem] min-w-0 flex-1"
              featured
              operators={dx7Algorithms[algorithm]}
            />
            <span className="flex shrink-0 flex-col items-start gap-1 text-[8px] font-bold uppercase tracking-wide text-cyan-100/65">
              <span><span className="mr-1 inline-block size-1.5 rounded-full bg-current" />{t('editor.carrier')}</span>
              <span><span className="mr-1 inline-block size-1.5 rounded-full border border-current" />{t('editor.modulator')}</span>
            </span>
          </span>
        </summary>

        <div
          aria-label={t('ui.dx7Algorithm')}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-30 grid max-h-[min(34rem,70vh)] w-[min(42rem,calc(100vw-1.5rem))] grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-cyan-300/35 bg-slate-950/95 p-2 shadow-2xl backdrop-blur sm:grid-cols-4"
          role="radiogroup"
        >
          {dx7Algorithms.map((operators, index) => (
            <button
              aria-checked={algorithm === index}
              aria-label={`Algorithm ${index + 1}`}
              className={cn(
                'relative min-w-0 rounded-md border border-white/10 bg-white/5 px-2 pb-1 pt-2 font-mono text-cyan-100/65 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                algorithm === index && 'border-primary bg-primary/20 text-primary shadow-[0_0_14px_hsl(315_100%_60%_/_0.4)] ring-1 ring-primary',
              )}
              key={index}
              onClick={() => selectAlgorithm(index)}
              role="radio"
              type="button"
            >
              <span className="absolute left-2 top-1.5 text-[10px] font-black text-white/70">
                {String(index + 1).padStart(2, '0')}
              </span>
              <AlgorithmDiagram operators={operators} />
            </button>
          ))}
        </div>
      </details>

      <label className="grid h-10 grid-cols-[auto_minmax(2rem,1fr)_1.25rem] items-center gap-2 rounded-b-xl border-t border-white/10 bg-black/15 px-3">
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-white/60">
          <RadioTower className="size-3 text-primary" />
          Feedback
          <HelpPopover
            className="text-white/55 hover:bg-white/10 hover:text-white"
            label={t('editor.feedback')}
            text={t('controlHelp.feedback')}
          />
        </span>
        <input
          aria-label={t('editor.feedback')}
          className="h-1.5 min-w-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          max={7}
          min={0}
          onBlur={onFeedbackGestureEnd}
          onChange={(event) => onFeedbackChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].includes(event.key)) {
              onFeedbackGestureStart()
            }
          }}
          onKeyUp={onFeedbackGestureEnd}
          onPointerCancel={onFeedbackGestureEnd}
          onPointerDown={onFeedbackGestureStart}
          onPointerUp={onFeedbackGestureEnd}
          step={1}
          type="range"
          value={feedback}
        />
        <output className="text-right font-mono text-sm font-black text-white">{feedback}</output>
      </label>
    </section>
  )
}

type OperatorStripProps = {
  algorithm: number
  mutedOperators: ReadonlySet<number>
  onSelect: (operator: number) => void
  parameters: Uint8Array
  selectedOperator: number
  soloOperator: number | null
}

export function OperatorStrip({
  algorithm,
  mutedOperators,
  onSelect,
  parameters,
  selectedOperator,
  soloOperator,
}: OperatorStripProps) {
  const { t } = useTranslation()
  return (
    <div
      aria-label={t('editor.operators')}
      className="scrollbar-none flex min-w-0 flex-1 items-stretch overflow-x-auto"
      role="tablist"
    >
      {Array.from({ length: 6 }, (_, index) => {
        const operator = index + 1
        const base = (6 - operator) * 21
        const rates = Array.from(parameters.slice(base, base + 4))
        const levels = Array.from(parameters.slice(base + 4, base + 8))
        const output = parameters[base + 16]
        const mode = parameters[base + 17]
        const coarse = parameters[base + 18]
        const fine = parameters[base + 19]
        const ratio = (coarse === 0 ? 0.5 : coarse) * (1 + fine / 100)
        const frequencyLabel = mode === 0
          ? formatOperatorRatio(ratio)
          : formatOperatorFixedFrequency(coarse, fine)
        const frequencyDescription = mode === 0
          ? `Frequency ratio: ${frequencyLabel}`
          : `Fixed frequency: ${frequencyLabel}`
        const color = operatorColors[index]
        const isSelected = selectedOperator === operator
        const algorithmOperator = dx7Algorithms[algorithm].find(({ id }) => id === operator)
        const role = algorithmOperator ? getDx7OperatorRole(algorithmOperator) : 'modulator'
        const roleLabel = role === 'carrier' ? t('editor.carrier') : t('editor.modulator')
        const auditionStatus = getOperatorAuditionStatus(operator, mutedOperators, soloOperator)
        const auditionLabel = [
          auditionStatus.muted ? 'muted' : null,
          auditionStatus.soloed ? 'soloed' : null,
        ].filter(Boolean).join(', ')

        return (
          <button
            aria-controls="focused-operator-panel"
            aria-label={`Operator ${operator}, ${roleLabel}${auditionLabel ? `, ${auditionLabel}` : ''}`}
            aria-selected={isSelected}
            className={cn(
              'group relative mt-2 min-w-[9.5rem] flex-1 overflow-hidden rounded-t-xl border border-b-0 bg-card/45 px-3 py-2 text-left opacity-75 transition-[background-color,opacity,transform,box-shadow] hover:bg-card/80 hover:opacity-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-w-[10.5rem]',
              index > 0 && '-ml-px',
              isSelected && 'z-[1] mt-0 bg-card opacity-100 shadow-[0_-4px_18px_hsl(260_60%_5%_/_0.08)] after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-[var(--operator-color)]',
            )}
            key={operator}
            onClick={() => onSelect(operator)}
            role="tab"
            style={{ '--operator-color': color } as React.CSSProperties}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-lg font-black text-[var(--operator-color)]">{operator}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]',
                    role === 'carrier'
                      ? 'border-[var(--operator-color)] bg-[color-mix(in_srgb,var(--operator-color)_14%,transparent)] text-[var(--operator-color)]'
                      : 'border-border/80 text-muted-foreground',
                  )}
                >
                  {roleLabel}
                </span>
              </div>
              <span
                aria-label={frequencyDescription}
                className="rounded bg-muted px-1.5 py-1 font-mono text-[10px] font-bold text-muted-foreground"
                title={frequencyDescription}
              >
                {frequencyLabel}
              </span>
            </div>
            <div aria-hidden="true" className="mt-0.5 flex h-4 items-center gap-1">
              {auditionStatus.muted ? (
                <span className="rounded border border-rose-400/70 bg-rose-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.08em] text-rose-300">
                  {t('editor.muted')}
                </span>
              ) : null}
              {auditionStatus.soloed ? (
                <span className="rounded border border-amber-300/70 bg-amber-300/15 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.08em] text-amber-700">
                  {t('editor.solo')}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-2 pb-0.5">
              <svg aria-hidden="true" className="h-7 min-w-0 flex-1 overflow-visible" viewBox="0 0 400 180">
                <path
                  d={envelopePath(rates, levels)}
                  fill="none"
                  stroke={color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="10"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="flex shrink-0 items-baseline gap-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>{t('editor.output')}</span>
                <span className="font-mono text-sm text-foreground">{output}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
