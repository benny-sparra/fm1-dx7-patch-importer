import { AudioWaveform, ChevronDown, RadioTower, Route } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpPopover } from '@/components/ui/help-popover'
import { dx7Algorithms, getDx7OperatorRole, type Dx7AlgorithmOperator } from '@/lib/dx7-algorithms'
import {
  envelopePath,
  formatOperatorFixedFrequency,
  formatOperatorRatio,
  operatorColors,
} from '@/lib/editor-visuals'
import { getOperatorAuditionStatus } from '@/lib/operator-audition'
import {
  FM1_OPERATOR_COUNT,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
  storedToDisplayValue,
} from '@/lib/fm1-parameters'
import { type PatchSyncState } from '@/lib/patch-sync-coordinator'
import { rangeStyle } from '@/lib/range-style'
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
      case 0:
        return `M ${x} ${y} V ${y + 10}`
      case 1:
        return `M ${x} ${y} V ${y + 7} H ${x + 18}`
      case 2:
        return `M ${x} ${y} V ${y + 8}`
      case 3:
        return `M ${x} ${y} V ${y + 10} M ${x} ${y + 7} H ${x + 18} V ${y + 10}`
      case 4:
        return `M ${x} ${y} V ${y + 10} M ${x - 18} ${y + 7} V ${y + 10} H ${x + 18} V ${y + 10}`
      case 6:
        return `M ${x} ${y} V ${y + 7} H ${x + 36}`
      case 7:
        return `M ${x} ${y} V ${y + 7} H ${x - 18}`
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
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {operators.map((operator) => (
          <path d={linkPath(operator)} key={`link-${operator.id}`} />
        ))}
        {operators.map((operator) => {
          const path = feedbackPath(operator)
          return path ? (
            <path className="opacity-65" d={path} key={`feedback-${operator.id}`} />
          ) : null
        })}
      </g>
      {operators.map((operator) => (
        <g key={operator.id}>
          <circle
            cx={nodeX(operator)}
            cy={nodeY(operator)}
            fill={getDx7OperatorRole(operator) === 'carrier' ? 'currentColor' : 'var(--crt-bg-2)'}
            r="6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <text
            className={cn(
              'font-dot-matrix text-[7px] font-black',
              getDx7OperatorRole(operator) === 'carrier'
                ? 'fill-[var(--crt-bg-0)]'
                : 'fill-current',
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
    <section className="editor-console relative z-10 flex w-full min-w-0 flex-col text-[var(--crt-ink)]">
      <details className="group flex-1" ref={dropdownRef}>
        <summary
          aria-label={`Algorithm ${algorithm + 1}. Choose algorithm`}
          className="crt-hatch flex h-[8rem] cursor-pointer list-none flex-col border-b border-[var(--crt-shadow)] px-[9px] pt-1.5 pb-1.5 transition-colors hover:bg-[var(--crt-bg-head)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="font-dot-matrix flex items-center gap-1.5 text-[13px] leading-none font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase">
              <Route className="size-3.5" />
              Algorithm
              <HelpPopover
                className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
                label={t('editor.algorithm')}
                text={t('controlHelp.algorithm')}
              />
            </span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </span>
          <span className="mt-1 flex min-h-0 w-full flex-1 -translate-y-2 items-center gap-1">
            <span className="font-vt323 text-2xl leading-none text-[var(--crt-led)]">
              {String(algorithm + 1).padStart(2, '0')}
            </span>
            <AlgorithmDiagram
              className="h-[4.75rem] min-w-0 flex-1"
              featured
              operators={dx7Algorithms[algorithm]}
            />
            <span className="flex shrink-0 flex-col items-start gap-1 text-[10px] font-bold tracking-[0.1em] text-[var(--crt-ink-3)] uppercase">
              <span>
                <span className="mr-1 inline-block size-2.5 rounded-full bg-current" />
                {t('editor.carrier')}
              </span>
              <span>
                <span className="mr-1 inline-block size-2.5 rounded-full border border-current" />
                {t('editor.modulator')}
              </span>
            </span>
          </span>
        </summary>

        <div
          aria-label={t('ui.dx7Algorithm')}
          className="editor-overlay-surface absolute top-[calc(100%+0.5rem)] left-0 z-30 grid max-h-[min(34rem,70vh)] w-[min(42rem,calc(100vw-1.5rem))] grid-cols-2 gap-1.5 overflow-y-auto border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-2 sm:grid-cols-4"
          role="radiogroup"
        >
          {dx7Algorithms.map((operators, index) => (
            <button
              aria-checked={algorithm === index}
              aria-label={`Algorithm ${index + 1}`}
              className={cn(
                'font-vt323 relative min-w-0 cursor-pointer border border-[var(--crt-line)] bg-[var(--crt-bg-2)] px-2 pt-2 pb-1 text-[var(--crt-acc-mid)] transition-colors hover:border-[var(--crt-acc-dim)] hover:bg-[var(--crt-bg-head)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                algorithm === index &&
                  'border-[var(--crt-led)] bg-[var(--crt-sel-bg)] text-[var(--crt-led)]',
              )}
              key={index}
              onClick={() => selectAlgorithm(index)}
              role="radio"
              type="button"
            >
              <span className="absolute top-1.5 left-2 text-[10px] text-[var(--crt-ink-3)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <AlgorithmDiagram operators={operators} />
            </button>
          ))}
        </div>
      </details>

      <label className="grid h-9 grid-cols-[auto_minmax(2rem,1fr)_1.25rem] items-center gap-2 border-t border-[var(--crt-line-dk)] bg-[var(--crt-bg-1)] px-[9px]">
        <span className="flex items-center gap-1 text-[9px] font-bold tracking-[0.1em] text-[var(--crt-ink-3)] uppercase">
          <RadioTower className="size-3 text-[var(--crt-acc)]" />
          Feedback
          <HelpPopover
            className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
            label={t('editor.feedback')}
            text={t('controlHelp.feedback')}
          />
        </span>
        <input
          aria-label={t('editor.feedback')}
          className="h-1.5 min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={7}
          min={0}
          onBlur={onFeedbackGestureEnd}
          onChange={(event) => onFeedbackChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (
              [
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'End',
                'Home',
                'PageDown',
                'PageUp',
              ].includes(event.key)
            ) {
              onFeedbackGestureStart()
            }
          }}
          onKeyUp={onFeedbackGestureEnd}
          onPointerCancel={onFeedbackGestureEnd}
          onPointerDown={onFeedbackGestureStart}
          onPointerUp={onFeedbackGestureEnd}
          step={1}
          style={rangeStyle(feedback, 0, 7)}
          type="range"
          value={feedback}
        />
        <output className="font-vt323 text-right text-sm text-[var(--crt-led)]">{feedback}</output>
      </label>
    </section>
  )
}

type OperatorRackProps = {
  algorithm: number
  mutedOperators: ReadonlySet<number>
  onSelect: (operator: number) => void
  onToggleMute: (operator: number) => void
  onToggleSolo: (operator: number) => void
  parameters: Uint8Array
  renderOperatorDetail: (operator: number) => ReactNode
  selectedOperator: number
  soloOperator: number | null
  syncState: PatchSyncState
}

export function OperatorsTitle() {
  const { t } = useTranslation()
  return (
    <div className="crt-hatch flex items-center justify-between gap-3 border-b border-[var(--crt-shadow)] px-[9px] py-1.5">
      <h2 className="font-dot-matrix flex items-center gap-2 text-[13px] font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase">
        <AudioWaveform aria-hidden="true" className="size-4 shrink-0" />
        {t('editor.operators')}
        <HelpPopover
          className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
          label={t('editor.fmOperators')}
          text={t('controlHelp.operator')}
        />
      </h2>
    </div>
  )
}

/**
 * The six operators as a vertical rack. Each row summarises one operator and
 * expands in place to reveal its full controls.
 *
 * This is an accordion rather than the tablist it replaces: the artboard puts
 * the detail panel directly beneath the row that opened it, and a tabpanel is
 * not allowed inside a tablist. Rows are therefore `aria-expanded` buttons
 * owning a labelled region, and only one is open at a time — selecting an
 * operator is still what opens it, so the editor keeps its single notion of a
 * "selected operator" and the MIDI audition path is unchanged.
 */
export function OperatorRack({
  algorithm,
  mutedOperators,
  onSelect,
  onToggleMute,
  onToggleSolo,
  parameters,
  renderOperatorDetail,
  selectedOperator,
  soloOperator,
  syncState,
}: OperatorRackProps) {
  const { t } = useTranslation()

  return (
    <div aria-label={t('editor.operators')} className="flex min-w-0 flex-col" role="group">
      {Array.from({ length: FM1_OPERATOR_COUNT }, (_, index) => {
        const operator = index + 1
        const base = resolveOperatorParameterIndex(operator, 'operator.envelope.rate1')
        const levelOffset = getOperatorParameterDefinition('operator.envelope.level1').offset
        const rates = Array.from(parameters.slice(base, base + 4))
        const levels = Array.from(parameters.slice(base + levelOffset, base + levelOffset + 4))
        const output = parameters[resolveOperatorParameterIndex(operator, 'operator.outputLevel')]
        const mode = parameters[resolveOperatorParameterIndex(operator, 'operator.oscillatorMode')]
        const coarse =
          parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')]
        const fine = parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.fine')]
        const ratio = (coarse === 0 ? 0.5 : coarse) * (1 + fine / 100)
        const frequencyLabel =
          mode === 0 ? formatOperatorRatio(ratio) : formatOperatorFixedFrequency(coarse, fine)
        const frequencyDescription =
          mode === 0 ? `Frequency ratio: ${frequencyLabel}` : `Fixed frequency: ${frequencyLabel}`
        const color = operatorColors[index]
        const isSelected = selectedOperator === operator
        const algorithmOperator = dx7Algorithms[algorithm].find(({ id }) => id === operator)
        const role = algorithmOperator ? getDx7OperatorRole(algorithmOperator) : 'modulator'
        const roleLabel = role === 'carrier' ? t('editor.carrier') : t('editor.modulator')
        const auditionStatus = getOperatorAuditionStatus(operator, mutedOperators, soloOperator)
        const auditionLabel = [
          auditionStatus.muted ? 'muted' : null,
          auditionStatus.soloed ? 'soloed' : null,
        ]
          .filter(Boolean)
          .join(', ')
        const summaryId = `operator-${operator}-summary`
        const detailId = `operator-${operator}-detail`

        /*
          The artboard's collapsed row also reports the envelope's rate and
          level pairs and a short parameter strip. They are readouts, not
          controls — the controls live in the panel this row opens — and they
          are dropped below xl, where the row has no width to spare.
        */
        const envelopeCells = rates.map((rate, point) => ({
          level: levels[point],
          point: point + 1,
          rate,
        }))
        const readValue = (id: Parameters<typeof getOperatorParameterDefinition>[0]) =>
          storedToDisplayValue(
            getOperatorParameterDefinition(id),
            parameters[resolveOperatorParameterIndex(operator, id)],
          )
        const summaryCells = [
          { label: 'DTUNE', value: readValue('operator.detune') },
          { label: 'VEL', value: readValue('operator.velocitySensitivity') },
          { label: 'A.MOD', value: readValue('operator.ampModSensitivity') },
          { label: 'SCALE', value: readValue('operator.keyboard.rateScaling') },
        ]

        return (
          <div
            className={cn(
              'operator-tab relative min-w-0 border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)]',
              index > 0 && '-mt-px',
              isSelected
                ? 'z-10 border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
                : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel3)]',
            )}
            key={operator}
            style={{ '--operator-color': color } as React.CSSProperties}
          >
            <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
              <button
                aria-controls={isSelected ? detailId : undefined}
                aria-expanded={isSelected}
                aria-label={`Operator ${operator}, ${roleLabel}${auditionLabel ? `, ${auditionLabel}` : ''}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                id={summaryId}
                onClick={() => onSelect(operator)}
                type="button"
              >
                <span
                  className={cn(
                    'font-dot-matrix grid h-6 w-[26px] shrink-0 place-items-center border bg-[var(--crt-bg-1)] text-sm font-bold',
                    isSelected
                      ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
                      : 'border-[var(--crt-line)] text-[var(--operator-color)]',
                  )}
                >
                  {operator}
                </span>
                <span
                  className={cn(
                    'operator-role-badge inline-flex shrink-0 border px-1.5 py-0.5 text-[8px] font-bold tracking-[0.12em] uppercase',
                    isSelected
                      ? 'border-[var(--crt-acc-dim)] text-[var(--crt-acc-lt)]'
                      : 'border-[var(--crt-line)] text-[var(--crt-ink-3)]',
                  )}
                >
                  {roleLabel}
                </span>

                {/* A one-line trace of the amplitude envelope, as on the panel. */}
                <svg
                  aria-hidden="true"
                  className="h-6 min-w-0 flex-1 overflow-visible"
                  viewBox="0 0 400 180"
                >
                  <path
                    d={envelopePath(rates, levels)}
                    fill="none"
                    stroke={isSelected ? 'var(--crt-acc-br)' : 'var(--crt-acc-dim)'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <span aria-hidden="true" className="hidden shrink-0 gap-px xl:flex">
                  {envelopeCells.map(({ level, point, rate }) => (
                    <span className="flex flex-col" key={point}>
                      <span className="flex gap-px">
                        <span className="w-7 bg-[var(--crt-bg-well)] px-1 text-[8px] tracking-[0.08em] text-[var(--crt-ink-4)]">
                          R{point}
                        </span>
                        <span className="w-7 bg-[var(--crt-bg-well)] px-1 text-[8px] tracking-[0.08em] text-[var(--crt-ink-4)]">
                          L{point}
                        </span>
                      </span>
                      <span className="font-vt323 flex gap-px">
                        <span className="w-7 bg-[var(--crt-bg-1)] px-1 text-xs text-[var(--crt-ink-2)]">
                          {rate}
                        </span>
                        <span className="w-7 bg-[var(--crt-bg-1)] px-1 text-xs text-[var(--crt-ink-2)]">
                          {level}
                        </span>
                      </span>
                    </span>
                  ))}
                </span>

                <span
                  aria-label={frequencyDescription}
                  className="operator-frequency font-vt323 shrink-0 border border-[var(--crt-line)] bg-[var(--crt-bg-well)] px-1.5 text-sm text-[var(--crt-acc-lt)]"
                  title={frequencyDescription}
                >
                  {frequencyLabel}
                </span>

                <span aria-hidden="true" className="hidden shrink-0 items-center gap-2 xl:flex">
                  {summaryCells.map(({ label, value }) => (
                    <span className="flex flex-col leading-none" key={label}>
                      <span className="text-[8px] tracking-[0.08em] text-[var(--crt-ink-4)]">
                        {label}
                      </span>
                      <span className="font-vt323 text-xs text-[var(--crt-ink-2)]">{value}</span>
                    </span>
                  ))}
                </span>
                <span className="flex shrink-0 items-baseline gap-1 text-[9px] font-bold tracking-[0.1em] text-[var(--crt-ink-3)] uppercase">
                  {t('editor.output')}
                  <span className="font-vt323 text-sm text-[var(--crt-ink)]">{output}</span>
                </span>
              </button>

              {/*
                Mute and solo sit on every row, not just the open one, so an
                operator can be silenced without first expanding it. They keep
                the labelling and the send-in-flight guard they had when they
                lived in the operator panel's header.
              */}
              <div
                aria-label={t('ui.auditionGroup', { number: operator })}
                className="flex shrink-0 items-center gap-1"
                role="group"
              >
                <button
                  aria-label={t('ui.auditionAction', {
                    action: t(auditionStatus.muted ? 'ui.unmute' : 'ui.mute'),
                    number: operator,
                  })}
                  aria-pressed={auditionStatus.muted}
                  className={cn(
                    'cursor-pointer border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50',
                    auditionStatus.muted
                      ? 'operator-audition-badge border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-destructive text-destructive-foreground'
                      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)]',
                  )}
                  disabled={syncState === 'sending'}
                  onClick={() => onToggleMute(operator)}
                  title={t(syncState === 'local' ? 'ui.auditionConnect' : 'ui.auditionTemporary', {
                    action: t(auditionStatus.muted ? 'ui.unmute' : 'ui.mute'),
                    number: operator,
                  })}
                  type="button"
                >
                  {t('ui.mute')}
                </button>
                <button
                  aria-label={t('ui.auditionAction', {
                    action: t(auditionStatus.soloed ? 'ui.unsolo' : 'ui.solo'),
                    number: operator,
                  })}
                  aria-pressed={auditionStatus.soloed}
                  className={cn(
                    'cursor-pointer border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50',
                    auditionStatus.soloed
                      ? 'operator-audition-badge border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-led)] text-[var(--crt-bg-0)]'
                      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)]',
                  )}
                  disabled={syncState === 'sending'}
                  onClick={() => onToggleSolo(operator)}
                  title={t(syncState === 'local' ? 'ui.auditionConnect' : 'ui.auditionTemporary', {
                    action: t(auditionStatus.soloed ? 'ui.unsolo' : 'ui.solo'),
                    number: operator,
                  })}
                  type="button"
                >
                  {t('ui.solo')}
                </button>
              </div>
            </div>

            {isSelected ? (
              <div
                aria-labelledby={summaryId}
                className="border-t border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)]"
                id={detailId}
                role="region"
              >
                {renderOperatorDetail(operator)}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
